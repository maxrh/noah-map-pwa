"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "@/components/map/map";
import { SearchBar } from "@/components/layout/search-bar";
import { CategoryFilter } from "@/components/layout/category-filter";
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
      <Map />
      <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col gap-2">
        <CategoryFilter />
        <SearchBar />
      </div>
      <Suspense>
        <FlyToHandler />
      </Suspense>
    </>
  );
}
