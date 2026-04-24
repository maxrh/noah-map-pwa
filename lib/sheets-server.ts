import { toSlug } from "@/lib/slug";

/**
 * Server-side helper for reading rows directly from the Google Sheets API.
 * Used by `sitemap.ts` and dynamic route metadata where we can't go through
 * the client-side `/api/sheet` proxy. Caches via Next.js fetch revalidation.
 */
export async function fetchSheetRows(
  range: string,
  revalidateSeconds = 1800,
): Promise<string[][]> {
  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.SHEETS_API_KEY;
  if (!sheetId || !apiKey) return [];

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}` +
    `/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
    if (!res.ok) return [];
    const data = (await res.json()) as { values?: string[][] };
    return data.values ?? [];
  } catch {
    return [];
  }
}

/** Convenience: fetch group rows (skipping the header row). */
export async function fetchGroupRows(): Promise<string[][]> {
  const rows = await fetchSheetRows("Grupper!A1:G100");
  return rows.slice(1);
}

/** Find a single group row by its slug. */
export async function findGroupRowBySlug(
  slug: string,
): Promise<string[] | null> {
  const rows = await fetchGroupRows();
  return rows.find((row) => toSlug(row[0] ?? "") === slug) ?? null;
}
