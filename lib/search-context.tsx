"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { fetchGroups, type Group } from "@/lib/groups";

interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  groups: Group[];
  loading: boolean;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  flyTo: (slug: string) => void;
  registerFlyTo: (fn: (slug: string) => void) => void;
}

const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
  groups: [],
  loading: true,
  selectedCategory: null,
  setSelectedCategory: () => {},
  flyTo: () => {},
  registerFlyTo: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const flyToRef = useRef<(slug: string) => void>(() => {});

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch((err) => console.error("Failed to fetch groups:", err))
      .finally(() => setLoading(false));
  }, []);

  const registerFlyTo = useCallback((fn: (slug: string) => void) => {
    flyToRef.current = fn;
  }, []);

  const flyTo = useCallback((slug: string) => {
    flyToRef.current(slug);
  }, []);

  return (
    <SearchContext.Provider
      value={{ query, setQuery, groups, loading, selectedCategory, setSelectedCategory, flyTo, registerFlyTo }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
