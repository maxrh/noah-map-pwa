/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  StaleWhileRevalidate,
  NetworkFirst,
  CacheFirst,
  ExpirationPlugin,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
import { PRECACHE_ROUTES } from "./routes.generated";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Bump these suffixes whenever URL keys in the cache become stale (e.g.
// after a route rename like /gruppe/* → /grupper/*). The activate handler
// sweeps any cache name not in KNOWN_CACHES, so old "pages"/"rsc" entries
// from previous builds get fully discarded.
const PAGES_CACHE = "pages-v3";
const RSC_CACHE = "rsc-v3";

// Dynamic route patterns whose cached shells can be reused for any ID.
// `/grupper/[slug]` is "use client" + reads the slug via usePathname() and
// loads group data from localStorage, so the shell HTML/RSC is identical
// for every slug — one cached entry covers all groups.
const DYNAMIC_ROUTE_SHELLS: Record<string, RegExp> = {
  grupper: /^\/grupper\/[^/]+$/,
};

// Seed at install time so the dynamic shell fallback always has something
// to serve. The slug doesn't have to exist — the page renders a not-found
// UI for unknown slugs, but the SHELL (header, layout, client bundle) is
// identical to a real group page.
const DYNAMIC_SHELL_SEEDS = ["/grupper/seed"];

// Map style assets MapLibre re-fetches on every map init. If any of these
// miss the cache offline, the basemap goes blank (no tile URL template,
// no sprite). Precaching guarantees they're available.
const PROTOMAPS_API_KEY = process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY ?? "";
const MAP_STYLE_URLS = [
  PROTOMAPS_API_KEY
    ? `https://api.protomaps.com/tiles/v4.json?key=${PROTOMAPS_API_KEY}`
    : null,
  "https://protomaps.github.io/basemaps-assets/sprites/v4/white.json",
  "https://protomaps.github.io/basemaps-assets/sprites/v4/white.png",
  "https://protomaps.github.io/basemaps-assets/sprites/v4/white@2x.json",
  "https://protomaps.github.io/basemaps-assets/sprites/v4/white@2x.png",
].filter((u): u is string => Boolean(u));

// Pre-warm a small set of overview tiles covering Denmark so the basemap
// renders even if the user goes offline during their first session before
// the SW could intercept any tile requests. ~20 tiles total at z5+z6.
const DK_BBOX = { west: 8.0, south: 54.5, east: 13.0, north: 57.8 };
const OVERVIEW_ZOOMS = [5, 6];

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

function buildOverviewTileUrls(): string[] {
  if (!PROTOMAPS_API_KEY) return [];
  const urls: string[] = [];
  for (const z of OVERVIEW_ZOOMS) {
    const x0 = lonToTileX(DK_BBOX.west, z);
    const x1 = lonToTileX(DK_BBOX.east, z);
    const y0 = latToTileY(DK_BBOX.north, z);
    const y1 = latToTileY(DK_BBOX.south, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        urls.push(
          `https://api.protomaps.com/tiles/v4/${z}/${x}/${y}.mvt?key=${PROTOMAPS_API_KEY}`,
        );
      }
    }
  }
  return urls;
}

// Plugin: short-circuit network when navigator.onLine === false.
// Throws synchronously before fetch is attempted, so NetworkFirst falls
// back to its cache (or handlerDidError) immediately. Without this, iOS
// Safari can sit on a hung fetch for the full networkTimeoutSeconds even
// though the device knows it's offline.
const offlineShortcut = {
  requestWillFetch: async ({ request }: { request: Request }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("[SW] offline — short-circuiting fetch");
    }
    return request;
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  // Don't claim mid-session — avoids blank pages when a new SW takes over
  // while the user is interacting with the page (RSC fetches in flight get
  // served by the new SW with mismatched state). Offline support fully
  // kicks in after the user closes and reopens the app once.
  clientsClaim: false,
  navigationPreload: false,
  runtimeCaching: [
    // /favicon.ico — browsers re-fetch this on every page load. Cache-first
    // against PAGES_CACHE (where the install step puts it) keeps the network
    // tab clean and avoids ERR_INTERNET_DISCONNECTED noise offline.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname === "/favicon.ico",
      handler: new CacheFirst({ cacheName: PAGES_CACHE }),
    },
    // Sheet API — SWR so groups stay fresh online and survive offline.
    // When offline and the exact range isn't cached, return an empty array
    // instead of throwing. The app reads groups from localStorage anyway,
    // so a synthetic 200 keeps the console clean without affecting UX.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/sheet"),
      handler: new StaleWhileRevalidate({
        cacheName: "sheet-api",
        plugins: [
          {
            handlerDidError: async () =>
              new Response("[]", {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
          },
        ],
      }),
    },
    // Other /api/* — never cache.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/sheet"),
      handler: new (class {
        async handle({ request }: { request: Request }) {
          return fetch(request);
        }
      })(),
    },
    // Navigation requests (HTML) — NetworkFirst so the served HTML always
    // references the current build's JS chunks. Falls back to cache only
    // when offline, with a smart fallback for unknown dynamic routes.
    // Short timeout (2s) so iOS Safari doesn't sit on a hung fetch when
    // offline — the OS is slow to surface offline state to fetch().
    {
      matcher: ({ request }) =>
        request.mode === "navigate" && !request.headers.get("RSC"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 2,
        plugins: [
          offlineShortcut,
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
          {
            handlerDidError: async ({ request }) => {
              const pathname = new URL(request.url).pathname;
              for (const [name, pattern] of Object.entries(DYNAMIC_ROUTE_SHELLS)) {
                if (pattern.test(pathname)) {
                  const cache = await caches.open(PAGES_CACHE);
                  const seed = await cache.match(`/${name}/seed`);
                  if (seed) {
                    console.log(`[SW] Serving cached HTML shell for ${pathname} from /${name}/seed`);
                    return seed;
                  }
                  // Fallback: any cached HTML matching the dynamic pattern.
                  const keys = await cache.keys();
                  for (const cachedRequest of keys) {
                    const cachedPath = new URL(cachedRequest.url).pathname;
                    if (pattern.test(cachedPath)) {
                      const cached = await cache.match(cachedRequest);
                      if (cached) {
                        console.log(`[SW] Serving cached HTML shell for ${pathname} from ${cachedPath}`);
                        return cached;
                      }
                    }
                  }
                }
              }
              // Final fallback: app shell ("/") so the client router can
              // still take over.
              const shell = await caches.match("/");
              if (shell) {
                console.log(`[SW] Serving root shell ("/") for ${pathname}`);
                return shell;
              }
              console.warn(`[SW] No offline fallback for ${pathname} \u2014 returning 503`);
              return new Response("Offline", { status: 503, statusText: "Offline" });
            },
          },
        ],
      }),
    },
    // RSC payloads — the "app shell" for client-side navigation.
    // StaleWhileRevalidate: serve cache instantly (zero perceived nav lag,
    // even on flaky mobile), then refresh in the background so the next
    // nav uses fresh data. Trade-off: a freshly deployed RSC surfaces one
    // navigation later — acceptable given the perf win.
    // ignoreSearch strips Next's `?_rsc=…` cache buster; ignoreVary
    // sidesteps Next-Router-State-Tree mismatches when matching offline.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.headers.get("RSC") === "1",
      handler: new StaleWhileRevalidate({
        cacheName: RSC_CACHE,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          // On cache miss SWR still awaits network — without this, an
          // offline first-nav to a never-visited slug hangs until the OS
          // surfaces the offline state (multiple seconds on mobile).
          offlineShortcut,
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
          {
            // Offline RSC fallback for dynamic /grupper/[slug] routes.
            //
            // Always serve the seed shell RSC (`/grupper/seed`) — never a
            // real group's cached RSC. Returning a real group's RSC would
            // merge that group's router state into the new URL, leaving
            // the page in an inconsistent state (blank or showing wrong
            // group). The seed shell is content-agnostic; the page reads
            // its slug from window.location (see app/grupper/[slug]/page.tsx),
            // so the real slug is honored regardless of which RSC ships.
            handlerDidError: async ({ request }) => {
              const pathname = new URL(request.url).pathname;
              for (const [name, pattern] of Object.entries(DYNAMIC_ROUTE_SHELLS)) {
                if (pattern.test(pathname)) {
                  const cache = await caches.open(RSC_CACHE);
                  const seedUrl = new URL(
                    `/${name}/seed`,
                    self.location.origin,
                  ).href;
                  const seed = await cache.match(
                    new Request(seedUrl, { headers: { RSC: "1" } }),
                    { ignoreVary: true, ignoreSearch: true },
                  );
                  if (seed) {
                    console.log(`[SW] Serving cached RSC shell for ${pathname} from /${name}/seed`);
                    return seed;
                  }
                }
              }
              console.log(`[SW] No cached RSC for ${pathname}, triggering MPA fallback`);
              return Response.error();
            },
          },
        ],
      }),
    },
    // Protomaps TileJSON — `v4.json?key=…`. MapLibre re-fetches this on
    // every map init, so it MUST be available offline or the basemap goes
    // blank. Use ignoreSearch so the cached entry matches regardless of
    // any subtle query-param drift between fetches.
    {
      matcher: ({ url }) =>
        url.hostname === "api.protomaps.com" && url.pathname.endsWith(".json"),
      handler: new CacheFirst({
        cacheName: "protomaps-tiles",
        matchOptions: { ignoreSearch: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Protomaps vector tiles
    {
      matcher: /^https:\/\/api\.protomaps\.com\/tiles\/.*/i,
      handler: new CacheFirst({
        cacheName: "protomaps-tiles",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Protomaps fonts + sprites. ignoreSearch so any cache-busting query
    // params don't cause misses on the sprite descriptors that MapLibre
    // re-fetches on every map init.
    {
      matcher: /^https:\/\/protomaps\.github\.io\/basemaps-assets\/.*/i,
      handler: new CacheFirst({
        cacheName: "protomaps-assets",
        matchOptions: { ignoreSearch: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // External (cross-origin) images only — group photos hosted on third
    // parties. Same-origin images (logo, icons in /public) are served from
    // the precache by Serwist, so we must NOT intercept them here or we'd
    // miss precache and break the logo offline.
    {
      matcher: ({ request, sameOrigin }) =>
        !sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "external-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

// ---------------------------------------------------------------------------
// Install: pre-cache pages + RSC for every static route + dynamic seeds.
// ---------------------------------------------------------------------------

async function cachePage(cache: Cache, route: string): Promise<boolean> {
  try {
    const res = await fetch(route);
    if (res.ok) {
      await cache.put(route, res);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function cacheRsc(cache: Cache, route: string): Promise<boolean> {
  try {
    const url = new URL(route, self.location.origin).href;
    const res = await fetch(url, {
      headers: { RSC: "1", "Next-Url": route },
    });
    if (res.ok) {
      await cache.put(new Request(url, { headers: { RSC: "1" } }), res);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

// Pre-fetch a stable cross-origin URL into the named runtime cache so it's
// guaranteed available offline. Used for the map style / sprite descriptors
// MapLibre re-fetches on every map init.
async function cacheCrossOrigin(cacheName: string, url: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(url, res);
    }
  } catch {
    /* ignore */
  }
}

async function broadcast(message: { type: string; [k: string]: unknown }) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) client.postMessage(message);
}

self.addEventListener("install", (event) => {
  const BATCH_SIZE = 3;
  event.waitUntil(
    Promise.all([caches.open(PAGES_CACHE), caches.open(RSC_CACHE)]).then(
      async ([pages, rsc]) => {
        await broadcast({ type: "SW_INSTALL_START" });

        // Belt-and-braces: explicitly cache /manifest.json. The Serwist
        // glob in next.config covers it, but browsers re-fetch the manifest
        // outside the SW's control on some platforms — caching it here
        // guarantees no offline ERR_INTERNET_DISCONNECTED noise.
        await cachePage(pages, "/manifest.json");

        // Same story for /favicon.ico — browsers fetch it on every page
        // load and it's not in the Serwist build manifest (lives in app/).
        await cachePage(pages, "/favicon.ico");

        // Pre-cache the map style descriptors (TileJSON + sprite). MapLibre
        // re-fetches these on every map init; missing them = blank basemap.
        // Each URL goes into the cache its runtime handler uses.
        await Promise.all(
          MAP_STYLE_URLS.map((url) =>
            cacheCrossOrigin(
              url.includes("api.protomaps.com")
                ? "protomaps-tiles"
                : "protomaps-assets",
              url,
            ),
          ),
        );

        // Pre-warm a small set of overview tiles covering Denmark so the
        // basemap renders even if the user goes offline during their very
        // first session (before the SW has had a chance to intercept any
        // tile requests). ~20 tiles, fired in parallel.
        await Promise.all(
          buildOverviewTileUrls().map((url) =>
            cacheCrossOrigin("protomaps-tiles", url),
          ),
        );

        // Seed dynamic shells first.
        await Promise.all(
          DYNAMIC_SHELL_SEEDS.map((route) =>
            Promise.all([cachePage(pages, route), cacheRsc(rsc, route)])
          )
        );

        // Pre-cache static routes in batches to avoid hammering the origin.
        let ok = 0;
        for (let i = 0; i < PRECACHE_ROUTES.length; i += BATCH_SIZE) {
          const batch = PRECACHE_ROUTES.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (route) => {
              const [page] = await Promise.all([
                cachePage(pages, route),
                cacheRsc(rsc, route),
              ]);
              return page;
            })
          );
          ok += results.filter(Boolean).length;
        }

        await broadcast({
          type: "SW_INSTALL_DONE",
          cached: ok,
          total: PRECACHE_ROUTES.length,
        });

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[SW] Pre-cached ${ok}/${PRECACHE_ROUTES.length} routes (+${DYNAMIC_SHELL_SEEDS.length} dynamic shell seed(s))`
          );
        }
      }
    )
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// On activate, delete any cache we don't recognize. Prevents accumulation
// of orphan caches across SW updates and removes any duplicates that may
// have appeared before this defensive cleanup existed.
const KNOWN_CACHES = new Set<string>([
  PAGES_CACHE,
  RSC_CACHE,
  "sheet-api",
  "protomaps-tiles",
  "protomaps-assets",
  "external-images",
  "next-static-js-assets",
  "next-static-css-assets",
  "next-static-image-assets",
  "next-data",
  "static-style-assets",
  "static-font-assets",
  "static-image-assets",
  "static-js-assets",
  "static-data-assets",
  "apis",
  "others",
  "cross-origin",
]);

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          // Keep Serwist's versioned precache (name starts with
          // "serwist-precache-") and any cache name we explicitly know.
          if (name.startsWith("serwist-precache-")) return;
          if (KNOWN_CACHES.has(name)) return;
          return caches.delete(name);
        }),
      );
    })(),
  );
});

if (process.env.NODE_ENV !== "production") {
  self.addEventListener("error", (e) => {
    console.warn("[SW] error", e.message);
  });
}

serwist.addEventListeners();
