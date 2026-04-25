"use client";

import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";

/**
 * Discrete status indicator next to the logo.
 *  - "installing": shown while the SW is pre-caching pages on first install.
 *  - "offline": shown whenever the device is offline.
 * Both states are non-blocking; the app remains usable.
 *
 * Implementation note: previously used useSyncExternalStore, but after a
 * hard MPA navigation (e.g. cross-layout offline nav that the SW couldn't
 * SPA-resolve), the SSR snapshot (online) sometimes "stuck" and React
 * never re-rendered with the real navigator.onLine value. Plain
 * useState + useEffect is more robust here: the initial state is read on
 * mount (always client-side) and then kept in sync via event listeners.
 */
export function StatusIndicator() {
  // Lazy initializer runs once on mount; safe to read navigator here
  // because this component is "use client" and the parent tree never
  // renders it during SSR-only paths.
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    // Run once on mount in case the lazy initial value was wrong (e.g.
    // navigator.onLine flipped between render and effect).
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // pageshow fires on bfcache restore AND after every full navigation,
    // ensuring the indicator re-syncs after MPA reloads.
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);
    // Safety-net poll: after a hard reload of an offline-served HTML
    // shell, hydration can race in ways that prevent the events above
    // from arriving on time. A cheap 5s navigator.onLine read guarantees
    // the indicator self-heals within a few seconds regardless.
    const poll = setInterval(update, 5000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    function startInstall() {
      if (!navigator.onLine) return;
      setInstalling(true);
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => setInstalling(false), 60_000);
    }
    function clearInstall() {
      setInstalling(false);
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
    }

    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "SW_INSTALL_START") startInstall();
      else if (data.type === "SW_INSTALL_DONE") clearInstall();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.installing && !navigator.serviceWorker.controller) {
        startInstall();
        reg.installing.addEventListener("statechange", function handler() {
          if (this.state === "activated" || this.state === "redundant") {
            clearInstall();
            this.removeEventListener("statechange", handler);
          }
        });
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  const status: "idle" | "installing" | "offline" = !isOnline
    ? "offline"
    : installing
      ? "installing"
      : "idle";

  const label =
    status === "offline"
      ? "Offline"
      : status === "installing"
        ? "Indlæser data"
        : "";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label || undefined}
      title={label || undefined}
      className="inline-flex items-center text-muted-foreground"
    >
      {status === "offline" && <WifiOff className="size-4" aria-hidden="true" />}
      {status === "installing" && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
    </span>
  );
}


