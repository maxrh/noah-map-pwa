import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";

interface SheetRow {
  values?: string[][];
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

async function fetchGroupSlugs(): Promise<string[]> {
  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.SHEETS_API_KEY;
  if (!sheetId || !apiKey) return [];

  const range = encodeURIComponent("Grupper!A1:G100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = (await res.json()) as SheetRow;
    return (data.values ?? [])
      .slice(1)
      .map((row) => toSlug(row[0] ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/liste`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/om`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const slugs = await fetchGroupSlugs();
  const groupEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/gruppe/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...groupEntries];
}
