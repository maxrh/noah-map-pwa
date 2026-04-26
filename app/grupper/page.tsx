"use client";

import { useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import { icons } from "lucide-react";
import { useSearch } from "@/lib/search-context";
import { SearchBar } from "@/components/layout/search-bar";
import { Skeleton } from "@/components/ui/skeleton";

const SCROLL_KEY = "grupper-scroll";

export default function GrupperPage() {
  const { query, groups, loading } = useSearch();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore previous scroll position once data is ready, then clear it so
  // a fresh navigation (e.g. from the header) starts at the top next time.
  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      el.scrollTop = parseInt(saved, 10) || 0;
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [loading]);

  // Save scroll only when navigating into a detail page – so back returns here,
  // but using the header nav to /grupper again starts fresh at the top.
  function saveScroll() {
    const el = scrollRef.current;
    if (el) sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [groups, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, { icon: string; items: typeof filtered }>();
    for (const g of filtered) {
      const key = g.category || "Andet";
      if (!map.has(key)) map.set(key, { icon: g.categoryIcon, items: [] });
      map.get(key)!.items.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "da"));
  }, [filtered]);

  if (loading) {
    const groupSkeletons: number[] = [4, 3];
    return (
      <div
        className="flex-1 overflow-y-auto"
        aria-busy="true"
        aria-live="polite"
        aria-label="Indlæser liste"
      >
        {groupSkeletons.map((count, gi) => (
          <div key={gi}>
            <div className="sticky top-0 z-10 bg-secondary px-6 py-3 flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <ul className="divide-y divide-border">
              {Array.from({ length: count }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 px-6 py-5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-4 w-2/5" />
                  </div>
                  <Skeleton className="size-4 shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div aria-hidden className="h-24" />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <SearchBar
        showSuggestions={false}
        className="fixed bottom-4 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] has-[input:focus]:pb-0"
      />
      {grouped.map(([category, { icon, items }]) => {
        const pascalName = icon
          ? icon.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
          : null;
        const Icon = pascalName && pascalName in icons
          ? icons[pascalName as keyof typeof icons]
          : null;
        return (
        <div key={category}>
          <h2 className="sticky top-0 z-10 bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground flex items-center gap-2">
            {Icon && <Icon className="size-4" />}
            {category}
          </h2>
          <ul className="divide-y divide-border">
            {items.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/grupper/${group.slug}`}
                  onClick={saveScroll}
                  className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/50 active:bg-muted/50 transition-colors focus-ring-inset"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.address}
                    </p>
                  </div>
                  <MoveRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        );
      })}
      <div aria-hidden className="h-24" />
    </div>
  );
}
