const PAGES_URL = `/api/sheet?range=${encodeURIComponent("Sider!A1:F100")}`;

export interface PageContent {
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  buttonText: string;
  buttonUrl: string;
}

const STORAGE_KEY = "noah-pages";
const SCHEMA_VERSION = 2; // bump when PageContent shape changes
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedData {
  v: number;
  pages: PageContent[];
  timestamp: number;
}

function getCached(): PageContent[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (cached.v !== SCHEMA_VERSION) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.pages;
  } catch {
    return null;
  }
}

function setCache(pages: PageContent[]) {
  try {
    const data: CachedData = { v: SCHEMA_VERSION, pages, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

let pendingPromise: Promise<PageContent[]> | null = null;

async function fetchFromNetwork(): Promise<PageContent[]> {
  const res = await fetch(PAGES_URL);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const [, ...rows] = (data.values ?? []) as string[][];

  const pages: PageContent[] = rows
    .filter((row) => row[0])
    .map((row) => ({
      slug: row[0] ?? "",
      title: row[1] ?? "",
      subtitle: row[2] ?? "",
      content: row[3] ?? "",
      buttonText: row[4] ?? "",
      buttonUrl: row[5] ?? "",
    }));

  setCache(pages);
  return pages;
}

export async function fetchPages(options: { force?: boolean } = {}): Promise<PageContent[]> {
  if (!options.force) {
    const cached = getCached();
    if (cached) return cached;
  }

  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    try {
      return await fetchFromNetwork();
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}

export async function fetchPage(slug: string): Promise<PageContent | null> {
  const pages = await fetchPages();
  return pages.find((p) => p.slug === slug) ?? null;
}
