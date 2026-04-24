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
  registerFlyTo: (fn: ((slug: string) => void) | null) => void;
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
  const flyToRef = useRef<((slug: string) => void) | null>(null);
  const pendingFlyToRef = useRef<string | null>(null);

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch((err) => console.error("Failed to fetch groups:", err))
      .finally(() => setLoading(false));
  }, []);

  // Background refresh when the device comes back online or tab regains focus.
  // Bypasses the localStorage cache to pull fresh data from the edge proxy.
  useEffect(() => {
    function refresh() {
      fetchGroups({ force: true })
        .then(setGroups)
        .catch((err) => console.error("Background refresh failed:", err));
    }

    function onVisibility() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const registerFlyTo = useCallback((fn: ((slug: string) => void) | null) => {
    flyToRef.current = fn;
    // Drain any pending fly-to that arrived before the map was ready
    if (fn && pendingFlyToRef.current) {
      const slug = pendingFlyToRef.current;
      pendingFlyToRef.current = null;
      fn(slug);
    }
  }, []);

  const flyTo = useCallback((slug: string) => {
    if (flyToRef.current) {
      flyToRef.current(slug);
    } else {
      // Map not ready yet — queue it
      pendingFlyToRef.current = slug;
    }
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
