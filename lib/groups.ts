const SHEET_ID = "13BI2EJSYTXIuffiyNyslXV1VyFrpUQMe3Q-ONjOEAzo";
const API_KEY = "AIzaSyBEIsBvTuy7b7RysY5_lTiXAYJu4Z3PXWU";
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Ark1!A1:G100?key=${API_KEY}`;

export interface Group {
  slug: string;
  name: string;
  description: string;
  address: string;
  image: string;
  category: string;
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
  timestamp: number;
}

function getCached(): Group[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.groups;
  } catch {
    return null;
  }
}

function setCache(groups: Group[]) {
  try {
    const data: CachedData = { groups, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export async function fetchGroups(): Promise<Group[]> {
  const cached = getCached();
  if (cached) return cached;

  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  const [, ...rows] = data.values as string[][];

  const groups = rows.map((row) => {
    const { lat, lng } = parseLocation(row[6] ?? "");
    return {
      slug: toSlug(row[0] ?? ""),
      name: row[0] ?? "",
      description: row[1] ?? "",
      address: row[2] ?? "",
      image: row[3] ?? "",
      category: row[4] ?? "",
      link: row[5] ?? "",
      lat,
      lng,
    };
  });

  setCache(groups);
  return groups;
}
