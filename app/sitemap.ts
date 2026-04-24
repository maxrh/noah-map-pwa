import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { toSlug } from "@/lib/slug";
import { fetchGroupRows } from "@/lib/sheets-server";

export const runtime = "edge";

async function fetchGroupSlugs(): Promise<string[]> {
  const rows = await fetchGroupRows();
  return rows.map((row) => toSlug(row[0] ?? "")).filter(Boolean);
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
