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
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // Offline detection
    function updateOnline() {
      if (!navigator.onLine) {
        setStatus("offline");
      } else {
        setStatus((prev) => (prev === "offline" ? "idle" : prev));
      }
    }
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", updateOnline);
        window.removeEventListener("offline", updateOnline);
      };
    }

    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    function clearInstall() {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      setStatus((prev) => (prev === "installing" ? "idle" : prev));
    }
    function startInstall() {
      if (!navigator.onLine) return;
      setStatus("installing");
      // Safety net: never spin forever, even if the SW never sends DONE.
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(clearInstall, 15_000);
    }

    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "SW_INSTALL_START") startInstall();
      else if (data.type === "SW_INSTALL_DONE") clearInstall();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Reflect existing SW state on mount.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      // Only show installing if there's an installing worker AND no
      // active controller yet (= true first install). Subsequent updates
      // happen silently in the background.
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
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
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
      className="inline-flex items-center text-muted-foreground"
    >
      {status === "offline" && <WifiOff className="size-4" aria-hidden="true" />}
      {status === "installing" && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
    </span>
  );
}
