"use client";

import { useEffect, useState } from "react";

function isNavigationError(reason: unknown): boolean {
  if (!reason) return false;
  const msg =
    (reason as { message?: string }).message ??
    (typeof reason === "string" ? reason : "");
  const name = (reason as { name?: string }).name ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /no-response/i.test(msg)
  );
}

export function PwaInit() {
  // Re-throw caught navigation errors during render so they hit
  // the nearest <ErrorBoundary> (app/error.tsx) — gives the user the
  // standard "Noget gik galt" screen with a reload button instead of
  // a silent blank page.
  const [navError, setNavError] = useState<Error | null>(null);
  if (navError) throw navError;

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

    function onRejection(e: PromiseRejectionEvent) {
      if (!isNavigationError(e.reason)) return;
      e.preventDefault();
      const err =
        e.reason instanceof Error
          ? e.reason
          : new Error(String(e.reason));
      setNavError(err);
    }
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
