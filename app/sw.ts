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

const PAGES_CACHE = "pages";
const RSC_CACHE = "rsc";

// Dynamic route patterns whose cached shells can be reused for any ID.
// `/gruppe/[slug]` is "use client" + reads the slug via usePathname() and
// loads group data from localStorage, so the shell HTML/RSC is identical
// for every slug — one cached entry covers all groups.
const DYNAMIC_ROUTE_SHELLS: Record<string, RegExp> = {
  gruppe: /^\/gruppe\/[^/]+$/,
};

// Seed at install time so the dynamic shell fallback always has something
// to serve. The slug doesn't have to exist — the page renders a not-found
// UI for unknown slugs, but the SHELL (header, layout, client bundle) is
// identical to a real group page.
const DYNAMIC_SHELL_SEEDS = ["/gruppe/seed"];

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
    // Sheet API — SWR so groups stay fresh online and survive offline.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/sheet"),
      handler: new StaleWhileRevalidate({ cacheName: "sheet-api" }),
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
    {
      matcher: ({ request }) =>
        request.mode === "navigate" && !request.headers.get("RSC"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
          {
            handlerDidError: async ({ request }) => {
              const pathname = new URL(request.url).pathname;
              for (const pattern of Object.values(DYNAMIC_ROUTE_SHELLS)) {
                if (pattern.test(pathname)) {
                  const cache = await caches.open(PAGES_CACHE);
                  const keys = await cache.keys();
                  for (const cachedRequest of keys) {
                    if (pattern.test(new URL(cachedRequest.url).pathname)) {
                      const cached = await cache.match(cachedRequest);
                      if (cached) return cached;
                    }
                  }
                }
              }
              // Final fallback: app shell ("/") so the client router can
              // still take over.
              const shell = await caches.match("/");
              if (shell) return shell;
              return new Response("Offline", { status: 503, statusText: "Offline" });
            },
          },
        ],
      }),
    },
    // RSC payloads — the "app shell" for client-side navigation.
    // NetworkFirst: always try fresh from origin so RSC payloads match the
    // current build's JS chunk hashes (a stale RSC from a previous build
    // references chunks that no longer exist → silent hydration failure →
    // blank page). Falls back to cache when offline.
    // ignoreSearch strips cache-busting `?_rsc=…`; ignoreVary sidesteps
    // Next-Router-State-Tree mismatches when matching offline fallback.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: RSC_CACHE,
        networkTimeoutSeconds: 5,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
          {
            handlerDidError: async ({ request }) => {
              const pathname = new URL(request.url).pathname;

              // 1. Try the seed shell directly. This is the canonical
              //    fallback and the most reliable lookup.
              for (const [key, pattern] of Object.entries(DYNAMIC_ROUTE_SHELLS)) {
                if (pattern.test(pathname)) {
                  const seed = DYNAMIC_SHELL_SEEDS.find((s) =>
                    s.startsWith(`/${key}/`),
                  );
                  if (seed) {
                    const seedUrl = new URL(seed, self.location.origin).href;
                    const direct = await caches.match(
                      new Request(seedUrl, { headers: { RSC: "1" } }),
                      { ignoreSearch: true, ignoreVary: true },
                    );
                    if (direct) return direct;
                  }

                  // 2. Iterate cache as a last resort (covers the case
                  //    where the seed never landed but a previously-visited
                  //    group's RSC is in cache).
                  const cache = await caches.open(RSC_CACHE);
                  const keys = await cache.keys();
                  for (const cachedRequest of keys) {
                    if (pattern.test(new URL(cachedRequest.url).pathname)) {
                      const cached = await cache.match(cachedRequest, {
                        ignoreVary: true,
                      });
                      if (cached) return cached;
                    }
                  }
                }
              }

              // 3. Give up. Returning Response.error() lets Next's router
                //    fall back to a full browser navigation (which goes
                //    through the navigation handler and ends at the cached
                //    HTML shell), instead of getting stuck on a blank page.
              return Response.error();
            },
          },
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
    // Protomaps fonts + sprites
    {
      matcher: /^https:\/\/protomaps\.github\.io\/basemaps-assets\/.*/i,
      handler: new CacheFirst({
        cacheName: "protomaps-assets",
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
