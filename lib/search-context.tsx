"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Group } from "@/lib/groups";

interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  flyTo: (slug: string) => void;
  registerFlyTo: (fn: (slug: string) => void) => void;
}

const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
  groups: [],
  setGroups: () => {},
  selectedCategory: null,
  setSelectedCategory: () => {},
  flyTo: () => {},
  registerFlyTo: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const flyToRef = useRef<(slug: string) => void>(() => {});

  const registerFlyTo = useCallback((fn: (slug: string) => void) => {
    flyToRef.current = fn;
  }, []);

  const flyTo = useCallback((slug: string) => {
    flyToRef.current(slug);
  }, []);

  return (
    <SearchContext.Provider
      value={{ query, setQuery, groups, setGroups, selectedCategory, setSelectedCategory, flyTo, registerFlyTo }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
