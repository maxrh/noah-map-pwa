"use client";

import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";

type Status = "idle" | "installing" | "offline";

/**
 * Discrete status indicator next to the logo.
 *  - "installing": shown while the SW is pre-caching pages on first install.
 *  - "offline": shown whenever the device is offline.
 * Both states are non-blocking; the app remains usable.
 */
export function StatusIndicator() {
  // Lazy initializer: read navigator.onLine synchronously on first render
  // so the indicator is correct immediately after hydration (instead of
  // briefly flashing idle on offline reload).
  const [status, setStatus] = useState<Status>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
    return "idle";
  });

  useEffect(() => {
    let installing = false;
    let online = navigator.onLine;

    function apply() {
      if (!online) setStatus("offline");
      else if (installing) setStatus("installing");
      else setStatus("idle");
    }
    apply();

    function onOnline() {
      online = true;
      apply();
    }
    function onOffline() {
      online = false;
      apply();
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    function clearInstall() {
      installing = false;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      apply();
    }
    function startInstall() {
      if (!online) return;
      installing = true;
      apply();
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(clearInstall, 15_000);
    }

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
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
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

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
      // suppressHydrationWarning: the server renders idle (no navigator), the
      // client may immediately render offline. The mismatch is intentional.
      suppressHydrationWarning
      className="inline-flex items-center text-muted-foreground"
    >
      {status === "offline" && <WifiOff className="size-4" aria-hidden="true" />}
      {status === "installing" && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
    </span>
  );
}

