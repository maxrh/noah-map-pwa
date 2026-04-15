"use client";

import { useMemo } from "react";
import { useSearch } from "@/lib/search-context";
import { CategoryBadge } from "@/components/ui/category-badge";
import { cn } from "@/lib/utils";

export function CategoryFilter() {
  const { groups, selectedCategory, setSelectedCategory } = useSearch();

  // Derive unique categories from groups that actually exist
  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // name -> iconName
    for (const g of groups) {
      if (g.category && !seen.has(g.category)) {
        seen.set(g.category, g.categoryIcon);
      }
    }
    return Array.from(seen, ([name, icon]) => ({ name, icon }));
  }, [groups]);

  if (categories.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-none px-4"
    >
      <button
        type="button"
        onClick={() => setSelectedCategory(null)}
        className="shrink-0"
      >
        <CategoryBadge
          category="Alle"
          className={cn(
            "cursor-pointer transition-opacity",
            selectedCategory !== null && "opacity-50"
          )}
        />
      </button>
      {categories.map((cat) => (
        <button
          key={cat.name}
          type="button"
          onClick={() =>
            setSelectedCategory(
              selectedCategory === cat.name ? null : cat.name
            )
          }
          className="shrink-0"
        >
          <CategoryBadge
            category={cat.name}
            iconName={cat.icon}
            className={cn(
              "cursor-pointer transition-opacity",
              selectedCategory !== null &&
                selectedCategory !== cat.name &&
                "opacity-50"
            )}
          />
        </button>
      ))}
    </div>
  );
}
