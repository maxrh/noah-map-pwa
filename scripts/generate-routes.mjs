/**
 * Generates a list of all static (non-dynamic) routes from the Next.js
 * App Router structure. Run before build to keep the SW pre-cache list
 * in sync with the actual pages on disk.
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
// These can't be pre-cached as literal URLs (handled via dynamic shell fallback)
const isDynamicSegment = (name) => name.startsWith("[") && name.endsWith("]");

function findRoutes(dir, basePath = "") {
  const routes = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDED_FOLDERS.includes(entry) || isPrivateFolder(entry)) continue;

      if (isRouteGroup(entry)) {
        routes.push(...findRoutes(fullPath, basePath));
        continue;
      }

      if (isDynamicSegment(entry)) continue;

      routes.push(...findRoutes(fullPath, `${basePath}/${entry}`));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      routes.push(basePath || "/");
    }
  }

  return routes;
}

const routes = findRoutes(APP_DIR).sort();

const output = `// AUTO-GENERATED — Do not edit manually.
// Run \`npm run generate-routes\` (or \`npm run build\`) to update.

export const PRECACHE_ROUTES = ${JSON.stringify(routes, null, 2)} as const;

export type PrecacheRoute = (typeof PRECACHE_ROUTES)[number];
`;

writeFileSync(OUTPUT_FILE, output, "utf-8");

console.log(
  `\u2713 Generated ${routes.length} routes to ${relative(process.cwd(), OUTPUT_FILE)}`
);
console.log(routes.map((r) => `  ${r}`).join("\n"));
