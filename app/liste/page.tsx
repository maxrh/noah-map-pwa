"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchGroups, type Group } from "@/lib/groups";
import { MoveRight } from "lucide-react";
import { useSearch } from "@/lib/search-context";
import { SearchBar } from "@/components/layout/search-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListePage() {
  const [groups, setLocalGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { query, setGroups: setContextGroups } = useSearch();

  useEffect(() => {
    fetchGroups()
      .then((g) => {
        setLocalGroups(g);
        setContextGroups(g);
      })
      .catch((err) => console.error("Failed to fetch groups:", err))
      .finally(() => setLoading(false));
  }, [setContextGroups]);

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

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchBar className="fixed bottom-4 left-0 right-0 z-50" />
      <ul className="divide-y divide-border">
        {filtered.map((group) => (
          <li key={group.slug}>
            <Link
              href={`/gruppe/${group.slug}`}
              className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/50 transition-colors"
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
}
