/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  StaleWhileRevalidate,
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
// `/gruppe/[slug]` is "use client" + reads the slug via useParams() and
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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  // Don't claim mid-session — avoids surprise reloads when a new SW takes
  // over while the user is interacting with the page.
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
    // Navigation requests (HTML) — SWR with a smart fallback for unknown
    // dynamic routes when offline.
    {
      matcher: ({ request }) =>
        request.mode === "navigate" && !request.headers.get("RSC"),
      handler: new StaleWhileRevalidate({
        cacheName: PAGES_CACHE,
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
    // RSC payloads — the "app shell" for client-side navigation. ignoreSearch
    // strips cache-busting `?_rsc=…`, ignoreVary sidesteps Next-Router-State-Tree
    // mismatches.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.headers.get("RSC") === "1",
      handler: new StaleWhileRevalidate({
        cacheName: RSC_CACHE,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response && response.status === 200 ? response : null,
          },
          {
            handlerDidError: async ({ request }) => {
              const pathname = new URL(request.url).pathname;
              const cache = await caches.open(RSC_CACHE);
              const keys = await cache.keys();
              for (const pattern of Object.values(DYNAMIC_ROUTE_SHELLS)) {
                if (pattern.test(pathname)) {
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
    // External group images
    {
      matcher: ({ request }) => request.destination === "image",
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

self.addEventListener("install", (event) => {
  const BATCH_SIZE = 3;
  event.waitUntil(
    Promise.all([caches.open(PAGES_CACHE), caches.open(RSC_CACHE)]).then(
      async ([pages, rsc]) => {
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

if (process.env.NODE_ENV !== "production") {
  self.addEventListener("error", (e) => {
    console.warn("[SW] error", e.message);
  });
}

serwist.addEventListeners();
