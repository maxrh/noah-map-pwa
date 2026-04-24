"use client";

import { useRef, useState, useMemo, type ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { CategoryBadge } from "@/components/ui/category-badge";
import { useSearch } from "@/lib/search-context";
import { cn } from "@/lib/utils";

export function SearchBar({
  className,
  showSuggestions: showSuggestionsProp = true,
}: {
  className?: string;
  showSuggestions?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery, groups, flyTo } = useSearch();
  const [focused, setFocused] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const suggestions = useMemo(() => {
    if (!showSuggestionsProp || !query.trim()) return [];
    const q = query.toLowerCase();
    return groups
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [groups, query, showSuggestionsProp]);

  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(slug: string) {
    setQuery("");
    setFocused(false);
    if (pathname !== "/") {
      router.push("/");
    }
    // The search context queues fly-to calls if the map isn't mounted yet,
    // so we can call this unconditionally without a setTimeout race.
    flyTo(slug);
  }

  return (
    <div className={cn("px-4", className)}>
      <div className="relative">
        <InputGroup className="shadow-md h-12 bg-input focus-within:ring-3 focus-within:ring-ring/50">
          <InputGroupInput
            placeholder="Søg..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => setFocused(false), 150);
            }}
            type="search"
            name="noah-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="text-base px-4"
          />
          <InputGroupAddon align="inline-end" className="pr-4">
            {query ? (
              <button
                type="button"
                aria-label="Ryd søgning"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery("")}
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-ring"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <Search className="h-5 w-5" />
            )}
          </InputGroupAddon>
        </InputGroup>

        {showSuggestions && (
          <ul
            aria-label="Søgeforslag"
            className="absolute z-50 bottom-full left-0 right-0 mb-1 bg-popover shadow-lg overflow-hidden"
          >
            {suggestions.map((g) => (
              <li key={g.slug}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-muted focus-visible:bg-muted transition-colors cursor-pointer outline-none"
                  onMouseDown={() => {
                    if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  }}
                  onClick={() => handleSelect(g.slug)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate flex-1 min-w-0">
                      {g.name}
                    </p>
                    <CategoryBadge
                      category={g.category}
                      iconName={g.categoryIcon}
                      size="xs"
                      className="shrink-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {g.address}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
