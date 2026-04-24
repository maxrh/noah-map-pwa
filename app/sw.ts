/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  StaleWhileRevalidate,
  CacheFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Navigations (HTML documents) — app shell pattern.
    // Try network first (so users get fresh HTML when online), but on failure
    // fall back to ANY cached page, preferring the precached "/" shell. The
    // Next.js client router then takes over and renders the right route from
    // localStorage data.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: async ({ request }) => {
        const cache = await caches.open("pages");
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok && fresh.type === "basic") {
            cache.put(request, fresh.clone()).catch(() => {});
          }
          if (fresh && fresh.ok) return fresh;
          throw new Error(`Bad response: ${fresh?.status}`);
        } catch {
          // Try the exact URL first (back/forward to a previously visited page)
          const cached = await cache.match(request);
          if (cached) return cached;
          // Fall back to the app shell ("/"), which boots the client router.
          const shell =
            (await caches.match("/")) ||
            (await caches.match("/index.html"));
          if (shell) return shell;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      },
    },
    // Sheet data via our edge proxy — instant from cache, refresh in bg
    {
      matcher: /\/api\/sheet/,
      handler: new StaleWhileRevalidate({
        cacheName: "sheet-api",
      }),
    },
    // Protomaps vector tiles — cache visited tiles for offline use
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
    // Protomaps assets (fonts, sprites)
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
    // External images (group photos etc.) — cache when available, never throw.
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

// Catch-all: if any strategy throws (e.g. offline + nothing cached),
// log it instead of letting it bubble. The fallback entry handles
// document requests; other failures (images, fonts) degrade silently.
if (process.env.NODE_ENV !== "production") {
  self.addEventListener("error", (e) => {
    console.warn("[SW] error", e.message);
  });
}

serwist.addEventListeners();

