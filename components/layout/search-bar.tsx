"use client";

import { useRef, useState, useMemo, type ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useSearch } from "@/lib/search-context";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery, groups, flyTo } = useSearch();
  const [focused, setFocused] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return groups
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [groups, query]);

  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(slug: string) {
    setQuery("");
    setFocused(false);
    if (pathname !== "/") {
      router.push("/");
      setTimeout(() => flyTo(slug), 500);
    } else {
      flyTo(slug);
    }
  }

  return (
    <div className={cn("px-4", className)}>
      <div className="relative">
        <InputGroup className="shadow-lg h-12 bg-secondary">
          <InputGroupInput
            placeholder="Søg..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => setFocused(false), 150);
            }}
            className="text-base px-4"
          />
          <InputGroupAddon align="inline-end" className="pr-4">
            <Search className="h-5 w-5" />
          </InputGroupAddon>
        </InputGroup>

        {showSuggestions && (
          <ul
            role="listbox"
            aria-label="Søgeforslag"
            className="absolute z-50 bottom-full left-0 right-0 mb-1 bg-popover shadow-lg overflow-hidden border border-border"
          >
            {suggestions.map((g) => (
              <li key={g.slug}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer"
                  onMouseDown={() => {
                    if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  }}
                  onClick={() => handleSelect(g.slug)}
                >
                  <p className="text-sm font-medium truncate">{g.name}</p>
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
