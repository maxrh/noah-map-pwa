import type { Metadata } from "next";

export const runtime = "edge";

interface GroupMeta {
  slug: string;
  name: string;
  description: string;
  image: string;
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

async function fetchGroup(slug: string): Promise<GroupMeta | null> {
  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.SHEETS_API_KEY;
  if (!sheetId || !apiKey) return null;

  const range = encodeURIComponent("Grupper!A1:G100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { values?: string[][] };
    const rows = (data.values ?? []).slice(1);
    for (const row of rows) {
      const name = row[0] ?? "";
      if (toSlug(name) === slug) {
        return {
          slug,
          name,
          description: row[1] ?? "",
          image: row[3] ?? "",
        };
      }
    }
  } catch {
    // Network/auth error – fall back to slug-derived metadata
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = await fetchGroup(slug);

  const title = group?.name ?? "Gruppe";
  const description =
    group?.description?.slice(0, 160) ??
    `Information om ${title} – en del af NOAH.`;
  const url = `/gruppe/${slug}`;
  const image = group?.image || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      ...(image
        ? { images: [{ url: image, alt: title }] }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  } satisfies Metadata;
}

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
