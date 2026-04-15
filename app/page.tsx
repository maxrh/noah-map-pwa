"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "@/components/map/map";
import { SearchBar } from "@/components/layout/search-bar";
import { useSearch } from "@/lib/search-context";

function FlyToHandler() {
  const searchParams = useSearchParams();
  const { flyTo } = useSearch();
  const flyToSlug = searchParams.get("flyTo");

  useEffect(() => {
    if (flyToSlug) {
      const timeout = setTimeout(() => flyTo(flyToSlug), 600);
      return () => clearTimeout(timeout);
    }
  }, [flyToSlug, flyTo]);

  return null;
}

export default function Home() {
  return (
    <>
      <Map />
      <SearchBar />
      <Suspense>
        <FlyToHandler />
      </Suspense>
    </>
  );
}
