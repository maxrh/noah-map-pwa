import { toSlug } from "@/lib/slug";
import { fetchGroupRows } from "@/lib/sheets-server";
import { GroupDetailClient } from "./group-detail-client";

// Pre-render one static HTML file per group at build time. With <100 POIs
// this is the textbook fit: every /gruppe/<slug> URL exists as a real file
// in the precache manifest, so the SW needs no dynamic-route fallback.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const rows = await fetchGroupRows();
  return rows
    .map((row) => ({ slug: toSlug(row[0] ?? "") }))
    .filter((p) => p.slug.length > 0);
}

// Statically render unknown slugs as a "not found" page (handled by the
// client) instead of attempting on-demand SSR (which `output: export` /
// Cloudflare Pages doesn't support anyway).
export const dynamicParams = false;
// Tell next-on-pages this route is fully static — without this, the layout's
// `generateMetadata` (which fetches Sheets) makes the adapter classify the
// route as needing edge runtime.
export const dynamic = "force-static";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GroupDetailClient slug={slug} />;
}
