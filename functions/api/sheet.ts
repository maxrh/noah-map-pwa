// Cloudflare Pages Function — proxies Google Sheets API with edge caching.
//
// Caching strategy:
//   s-maxage=1800        → Cloudflare edge serves cached response for 30 min
//   stale-while-revalidate=3600 → up to 1h stale while edge refreshes in background
//
// This keeps the API key server-side and dramatically reduces direct calls to
// Google Sheets (one per edge POP per 30 min instead of one per visitor).

interface Env {
  SHEET_ID: string;
  SHEETS_API_KEY: string;
}

interface EventContext {
  request: Request;
  env: Env;
}

const ALLOWED_RANGES = new Set([
  "Grupper!A1:G100",
  "Kategorier!A1:B100",
  "Sider!A1:F100",
]);

export const onRequestGet = async (context: EventContext): Promise<Response> => {
  const url = new URL(context.request.url);
  const range = url.searchParams.get("range");

  if (!range || !ALLOWED_RANGES.has(range)) {
    return new Response("Invalid range", { status: 400 });
  }

  const { SHEET_ID, SHEETS_API_KEY } = context.env;
  if (!SHEET_ID || !SHEETS_API_KEY) {
    return new Response("Sheets API not configured", { status: 500 });
  }

  const upstream = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
    range
  )}?key=${SHEETS_API_KEY}`;

  const upstreamRes = await fetch(upstream);

  if (!upstreamRes.ok) {
    return new Response(`Upstream error: ${upstreamRes.status}`, {
      status: 502,
    });
  }

  const body = await upstreamRes.text();
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control":
        "public, s-maxage=1800, stale-while-revalidate=3600",
      "access-control-allow-origin": "*",
    },
  });
};
