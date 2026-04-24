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

    // SW install progress
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "SW_INSTALL_START") {
        if (navigator.onLine) setStatus("installing");
      } else if (data.type === "SW_INSTALL_DONE") {
        setStatus((prev) => (prev === "installing" ? "idle" : prev));
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);

    // If a SW is already installing when this mounts, reflect that
    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (reg?.installing && navigator.onLine) setStatus("installing");
    });

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  if (status === "idle") return null;

  if (status === "offline") {
    return (
      <span
        role="status"
        aria-label="Offline"
        title="Offline"
        className="inline-flex items-center text-muted-foreground"
      >
        <WifiOff className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label="Forbereder offline-tilstand"
      title="Forbereder offline-tilstand"
      className="inline-flex items-center text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    </span>
  );
}
