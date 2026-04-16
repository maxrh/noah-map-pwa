const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID;
const API_KEY = process.env.NEXT_PUBLIC_SHEETS_API_KEY;
const GROUPS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Grupper!A1:G100?key=${API_KEY}`;
const CATEGORIES_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Kategorier!A1:B100?key=${API_KEY}`;

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

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseLocation(location: string): { lat: number; lng: number } {
  const [lat, lng] = location.split(",").map((s) => parseFloat(s.trim()));
  return { lat: lat || 0, lng: lng || 0 };
}

const STORAGE_KEY = "noah-groups";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedData {
  groups: Group[];
  categories: Category[];
  timestamp: number;
}

function getCached(): { groups: Group[]; categories: Category[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return { groups: cached.groups, categories: cached.categories };
  } catch {
    return null;
  }
}

function setCache(groups: Group[], categories: Category[]) {
  try {
    const data: CachedData = { groups, categories, timestamp: Date.now() };
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

export async function fetchGroups(): Promise<Group[]> {
  const cached = getCached();
  if (cached) return cached.groups;

  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    try {
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
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}
