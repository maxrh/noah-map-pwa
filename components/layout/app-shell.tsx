"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { Map } from "@/components/map/map";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSearch } from "@/lib/search-context";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Reads ?flyTo=<slug> from the URL and triggers a map fly-to. Lives at
 * shell level so it works regardless of which page is mounted (e.g. a deep
 * link from a group detail page back to "/" with ?flyTo=…).
 */
function FlyToHandler() {
  const searchParams = useSearchParams();
  const { flyTo } = useSearch();
  const flyToSlug = searchParams.get("flyTo");

  useEffect(() => {
    if (flyToSlug) flyTo(flyToSlug);
  }, [flyToSlug, flyTo]);

  return null;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isMapPage = pathname === "/";

  return (
    <div className="relative flex flex-col h-dvh text-foreground overflow-hidden">
      <Header transparent={isMapPage} />

      {/* Persistent map layer — stays mounted across navigations so MapLibre
          doesn't tear down + rebuild the GL context every time the user
          returns to "/". Hidden (but still in the DOM) on subpages. */}
      <div
        aria-hidden={!isMapPage}
        className={cn(
          "absolute inset-0 flex flex-col",
          // Hide entirely on subpages so map controls (rendered into the
          // map container's DOM) disappear instantly. `display: none`
          // doesn't unmount React, so MapLibre keeps its GL context alive.
          isMapPage ? "z-0" : "hidden",
        )}
      >
        <ErrorBoundary
          fallback={
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <h2 className="text-lg font-semibold mb-2">Kortet kunne ikke indlæses</h2>
                <p className="text-sm text-muted-foreground">
                  Brug listevisningen i menuen for at finde grupper.
                </p>
              </div>
            </div>
          }
        >
          <Map />
        </ErrorBoundary>
        <Suspense fallback={null}>
          <FlyToHandler />
        </Suspense>
      </div>

      <main
        className={cn(
          "relative flex-1 min-h-0 flex flex-col",
          // On the map page, <main> is empty (overlays are fixed-position).
          // Make it pass clicks through to the persistent map underneath.
          isMapPage && "-mt-19 pointer-events-none *:pointer-events-auto",
        )}
      >
        {children}
      </main>
    </div>
  );
}
