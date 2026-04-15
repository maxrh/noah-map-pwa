"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "@/components/map/map";
import { SearchBar } from "@/components/layout/search-bar";
import { useSearch } from "@/lib/search-context";

export default function Home() {
  const searchParams = useSearchParams();
  const { flyTo } = useSearch();
  const flyToSlug = searchParams.get("flyTo");

  useEffect(() => {
    if (flyToSlug) {
      // Small delay to allow map and markers to mount
      const timeout = setTimeout(() => flyTo(flyToSlug), 600);
      return () => clearTimeout(timeout);
    }
  }, [flyToSlug, flyTo]);

  return (
    <>
      <Map />
      <SearchBar />
    </>
  );
}
