import { toSlug } from "./slug";

const GROUPS_URL = `/api/sheet?range=${encodeURIComponent("Grupper!A1:G100")}`;
const CATEGORIES_URL = `/api/sheet?range=${encodeURIComponent("Kategorier!A1:B100")}`;

export interface Category {
  name: string;
  icon: string;
}

export interface Group {
  slug: string;
  name: string;
  description: string;
  address: string;
  image: string;
  category: string;
  categoryIcon: string;
  link: string;
  lat: number;
  lng: number;
}

function parseLocation(location: string): { lat: number; lng: number } {
  const [lat, lng] = location.split(",").map((s) => parseFloat(s.trim()));
  return { lat: lat || 0, lng: lng || 0 };
}

const STORAGE_KEY = "noah-groups";
const SCHEMA_VERSION = 1; // bump when Group/Category shape changes

interface CachedData {
  v: number;
  groups: Group[];
  categories: Category[];
  timestamp: number;
}

function getCached(): { groups: Group[]; categories: Category[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (cached.v !== SCHEMA_VERSION) return null;
    return { groups: cached.groups, categories: cached.categories };
  } catch {
    return null;
  }
}

function setCache(groups: Group[], categories: Category[]) {
  try {
    const data: CachedData = {
      v: SCHEMA_VERSION,
      groups,
      categories,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(CATEGORIES_URL);
  if (!res.ok) return [];
  const data = await res.json();
  const [, ...rows] = (data.values ?? []) as string[][];
  return rows.map((row) => ({
    name: row[0] ?? "",
    icon: row[1] ?? "",
  }));
}

// In-memory promise dedup — prevents concurrent fetches
let pendingPromise: Promise<Group[]> | null = null;

async function fetchFromNetwork(): Promise<Group[]> {
  const [groupsRes, categories] = await Promise.all([
    fetch(GROUPS_URL),
    fetchCategories(),
  ]);

  if (!groupsRes.ok) throw new Error(`API error: ${groupsRes.status}`);

  const data = await groupsRes.json();
  const [, ...rows] = data.values as string[][];

  const iconMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.icon]));

  const groups = rows.map((row) => {
    const { lat, lng } = parseLocation(row[6] ?? "");
    const category = row[4] ?? "";
    return {
      slug: toSlug(row[0] ?? ""),
      name: row[0] ?? "",
      description: row[1] ?? "",
      address: row[2] ?? "",
      image: row[3] ?? "",
      category,
      categoryIcon: iconMap.get(category.toLowerCase()) ?? "",
      link: row[5] ?? "",
      lat,
      lng,
    };
  });

  setCache(groups, categories);
  return groups;
}

export async function fetchGroups(options: { force?: boolean } = {}): Promise<Group[]> {
  // Cache-first: instant render, even when offline. Background refresh happens
  // via the search context's online/visibility listeners (force: true).
  if (!options.force) {
    const cached = getCached();
    if (cached) return cached.groups;
  }

  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    try {
      return await fetchFromNetwork();
    } catch (err) {
      // Network failed (offline / API down). Fall back to any stale cache
      // we have so the app keeps working.
      const cached = getCached();
      if (cached) return cached.groups;
      throw err;
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}
