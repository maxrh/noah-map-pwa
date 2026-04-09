"use client";

import { useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { List, MoveLeft, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useSearch } from "@/lib/search-context";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isDetailPage = pathname.startsWith("/gruppe/");
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
      // flyTo after navigation — small delay for map to mount
      setTimeout(() => flyTo(slug), 500);
    } else {
      flyTo(slug);
    }
  }

  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b bg-background shrink-0">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Image
          src="/Logo_NOAH_2020_small.png"
          alt="NOAH logo"
          width={650}
          height={265}
          priority
          className="h-8 w-auto"
        />
      </Link>

      {!isDetailPage && (
        <div className="relative max-w-sm w-full ml-auto">
          <InputGroup>
            <InputGroupInput
              placeholder="Søg..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => setFocused(false), 150);
              }}
            />
            <InputGroupAddon align="inline-end">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          {showSuggestions && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover shadow-lg overflow-hidden">
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
      )}

      <div
        className={`flex items-center gap-1 ${isDetailPage ? "ml-auto" : ""} shrink-0`}
      >
        {isDetailPage && (
          <Link
            href="/"
            aria-label="Tilbage til kort"
            className={buttonVariants({ variant: "link" })}
          >
            <MoveLeft className="h-5 w-5" />
            Kort
          </Link>
        )}
        <Link
          href="/liste"
          aria-label="Listevisning"
          className={
            buttonVariants({ variant: "ghost", size: "icon" }) +
            " bg-neutral-100  hover:bg-neutral-200"
          }
        >
          <List className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
