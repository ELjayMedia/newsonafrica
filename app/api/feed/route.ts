/**
 * GET /api/feed?scope=africa|edition|category&country=…&category=…&cursor=…
 *
 * Next page of an infinite story feed (home and category pages). The cursor
 * is the opaque value returned by the previous page (or seeded by the
 * server-rendered page); page size is fixed server-side. Responses are
 * public and CDN-cacheable for a minute, matching the DAL's 60s revalidate.
 */
import { NextResponse, type NextRequest } from "next/server";

import { isValidCountry } from "@/lib/countries";
import { decodeFeedCursor, FEED_PAGE_SIZE, type FeedScope } from "@/lib/feed/cursor";
import { loadFeedPage } from "@/lib/feed/load";
import { createLogger } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api:feed");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/;
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

function parseScope(params: URLSearchParams): FeedScope | null {
  const scope = params.get("scope");
  if (scope === "africa") return { kind: "africa" };

  const country = params.get("country") ?? "";
  if (!isValidCountry(country)) return null;
  if (scope === "edition") return { kind: "edition", country };

  const slug = params.get("category") ?? "";
  if (scope === "category" && SLUG_PATTERN.test(slug)) return { kind: "category", country, slug };
  return null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope = parseScope(params);
  const cursor = params.get("cursor");
  const state = scope && cursor ? decodeFeedCursor(cursor, scope) : null;

  if (!scope || !state) {
    return NextResponse.json(
      { error: "Invalid feed request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const page = await loadFeedPage(scope, state, FEED_PAGE_SIZE);
    return NextResponse.json(page, { headers: CACHE_HEADERS });
  } catch (error) {
    log.warn("Feed page unavailable", { scope: scope.kind, err: error });
    return NextResponse.json(
      { error: "Feed unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
