"use client";

import { SearchBar } from "@/components/layout/search-bar";
import { CategoryFilter } from "@/components/layout/category-filter";

/**
 * The map itself is rendered by AppShell so it stays mounted across
 * navigations. This page only adds the floating overlay controls.
 */
export default function Home() {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] has-[input:focus]:pb-0">
      <CategoryFilter />
      <SearchBar />
    </div>
  );
}
