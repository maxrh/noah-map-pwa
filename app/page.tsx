"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "@/components/map/map";
import { SearchBar } from "@/components/layout/search-bar";
import { CategoryFilter } from "@/components/layout/category-filter";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSearch } from "@/lib/search-context";

function FlyToHandler() {
  const searchParams = useSearchParams();
  const { flyTo } = useSearch();
  const flyToSlug = searchParams.get("flyTo");

  useEffect(() => {
    if (flyToSlug) {
      flyTo(flyToSlug);
    }
  }, [flyToSlug, flyTo]);

  return null;
}

export default function Home() {
  return (
    <>
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
      <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <CategoryFilter />
        <SearchBar />
      </div>
      <Suspense fallback={null}>
        <FlyToHandler />
      </Suspense>
    </>
  );
}
