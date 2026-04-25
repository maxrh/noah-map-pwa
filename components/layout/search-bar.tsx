"use client";

import { useRef, useState, useMemo, useId, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  // Clear pending blur timer on unmount
  useEffect(() => () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  }, []);

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

  // Reset highlight whenever the suggestion list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex].slug);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div
      className={cn("px-4", className)}
      style={{
        paddingLeft: "calc(1rem + env(safe-area-inset-left))",
        paddingRight: "calc(1rem + env(safe-area-inset-right))",
      }}
    >
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
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showSuggestions && activeIndex >= 0
                ? `${listboxId}-opt-${activeIndex}`
                : undefined
            }
            type="search"
            name="noah-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="text-base px-4"
          />
          <InputGroupAddon align="inline-end" className="pr-4 has-[>button]:mr-0">
            {query ? (
              <button
                type="button"
                aria-label="Ryd søgning"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery("")}
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-ring"
              >
                <X className="size-4" />
              </button>
            ) : (
              <Search className="size-4" />
            )}
          </InputGroupAddon>
        </InputGroup>

        {showSuggestions && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Søgeforslag"
            className="absolute z-50 bottom-full left-0 right-0 mb-1 bg-popover shadow-lg overflow-hidden"
          >
            {suggestions.map((g, i) => (
              <li key={g.slug} role="presentation">
                <button
                  id={`${listboxId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-colors cursor-pointer outline-none",
                    i === activeIndex ? "bg-muted" : "hover:bg-muted focus-visible:bg-muted"
                  )}
                  onMouseDown={() => {
                    if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
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
