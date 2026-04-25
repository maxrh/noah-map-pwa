/**
 * Generates the SW pre-cache route list.
 *  - Walks the App Router for all static (non-dynamic) routes
 *  - Fetches group slugs from Google Sheets and adds /gruppe/<slug> for each
 *
 * Run before build (npm run build → prebuild) so the generated list always
 * matches what Next.js statically renders via generateStaticParams.
 */

import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, "..", "app");
const OUTPUT_FILE = join(__dirname, "..", "app", "routes.generated.ts");

// Folders to exclude from route generation
const EXCLUDED_FOLDERS = [
  "api",   // API routes (not navigable)
  "test",  // Test pages (development only)
];

// Route groups in Next.js: (folder) - traverse but don't add to URL path
const isRouteGroup = (name) => name.startsWith("(") && name.endsWith(")");
// Private folders: _folder - skip entirely
const isPrivateFolder = (name) => name.startsWith("_");
// Dynamic route segments: [param] / [...param] / [[...param]]
const isDynamicSegment = (name) => name.startsWith("[") && name.endsWith("]");

function findStaticRoutes(dir, basePath = "") {
  const routes = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDED_FOLDERS.includes(entry) || isPrivateFolder(entry)) continue;
      if (isRouteGroup(entry)) {
        routes.push(...findStaticRoutes(fullPath, basePath));
        continue;
      }
      if (isDynamicSegment(entry)) continue;
      routes.push(...findStaticRoutes(fullPath, `${basePath}/${entry}`));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      routes.push(basePath || "/");
    }
  }

  return routes;
}

/** Slug helper — must match lib/slug.ts. */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Fetch group slugs from the Google Sheets API. Returns [] when credentials
 * are missing (e.g. local dev without env vars) so the build still succeeds.
 */
async function fetchGroupSlugs() {
  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.SHEETS_API_KEY;
  if (!sheetId || !apiKey) {
    console.warn(
      "  (no SHEET_ID/SHEETS_API_KEY — group slugs will not be precached)"
    );
    return [];
  }
  const range = encodeURIComponent("Grupper!A1:G100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  (Sheets API returned ${res.status} — skipping slugs)`);
      return [];
    }
    const data = await res.json();
    const rows = (data.values ?? []).slice(1); // drop header row
    return rows
      .map((row) => toSlug(row?.[0] ?? ""))
      .filter(Boolean);
  } catch (err) {
    console.warn(`  (Sheets fetch failed: ${err.message} — skipping slugs)`);
    return [];
  }
}

const staticRoutes = findStaticRoutes(APP_DIR);
const slugs = await fetchGroupSlugs();
const groupRoutes = slugs.map((slug) => `/gruppe/${slug}`);

const routes = [...staticRoutes, ...groupRoutes].sort();

const output = `// AUTO-GENERATED — Do not edit manually.
// Run \`npm run generate-routes\` (or \`npm run build\`) to update.

export const PRECACHE_ROUTES = ${JSON.stringify(routes, null, 2)} as const;

export type PrecacheRoute = (typeof PRECACHE_ROUTES)[number];
`;

writeFileSync(OUTPUT_FILE, output, "utf-8");

console.log(
  `\u2713 Generated ${routes.length} routes (${staticRoutes.length} static + ${groupRoutes.length} groups) → ${relative(process.cwd(), OUTPUT_FILE)}`
);
