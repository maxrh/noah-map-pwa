import type { Metadata } from "next";
import { findGroupRowBySlug } from "@/lib/sheets-server";

export const runtime = "edge";

interface GroupMeta {
  slug: string;
  name: string;
  description: string;
  image: string;
}

async function fetchGroup(slug: string): Promise<GroupMeta | null> {
  const row = await findGroupRowBySlug(slug);
  if (!row) return null;
  return {
    slug,
    name: row[0] ?? "",
    description: row[1] ?? "",
    image: row[3] ?? "",
  };
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
