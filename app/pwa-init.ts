"use client";

import { useEffect } from "react";

export function PwaInit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In dev mode the SW is intentionally not built (see next.config.mjs).
    // If a stale `public/sw.js` from a previous prod build is still
    // registered against the dev server, it hammers the on-demand compiler
    // and makes everything sluggish. Unregister it + clear its caches so
    // dev is always clean.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[PwaInit] Service Worker registration failed:", error);
    });
  }, []);
  return null;
}
