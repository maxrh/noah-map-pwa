"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader2, WifiOff } from "lucide-react";

/**
 * Discrete status indicator next to the logo.
 *  - "installing": shown while the SW is pre-caching pages on first install.
 *  - "offline": shown whenever the device is offline.
 * Both states are non-blocking; the app remains usable.
 */

// useSyncExternalStore is React's canonical primitive for subscribing to
// browser state. It guarantees a fresh read on every render, so the
// indicator stays correct across hard navigations, bfcache restores, etc.
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  window.addEventListener("pageshow", callback);
  document.addEventListener("visibilitychange", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
    window.removeEventListener("pageshow", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}
const getIsOnline = () => navigator.onLine;
// Server snapshot: assume online so SSR markup matches the optimistic case;
// the client immediately re-reads after mount.
const getIsOnlineServer = () => true;

export function StatusIndicator() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getIsOnline,
    getIsOnlineServer,
  );
  const [installing, setInstalling] = useState(false);

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


