/**
 * GET /api/search/suggest?q=…&country=…&limit=… (NOA-95)
 *
 * Type-ahead title suggestions for the search box, backed by the NOA-93
 * `search_suggestions` RPC (trigram substring match, prefix hits first).
 * Input is trimmed/validated and the limit capped by the shared param
 * helpers; responses are `no-store` since they track a live index.
 */
import { NextResponse, type NextRequest } from "next/server";

import { searchSuggestions } from "@/lib/search";
import {
  MIN_SUGGESTION_QUERY_LENGTH,
  normalizeCountryFilter,
  normalizeSearchQuery,
  normalizeSuggestionLimit,
} from "@/lib/search/params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = normalizeSearchQuery(params.get("q"));
  const country = normalizeCountryFilter(params.get("country"));
  const limit = normalizeSuggestionLimit(params.get("limit"));

  if (query.length < MIN_SUGGESTION_QUERY_LENGTH) {
    return NextResponse.json({ query, suggestions: [] }, { headers: NO_STORE_HEADERS });
  }

  const suggestions = await searchSuggestions({ query, country, limit });

  return NextResponse.json({ query, suggestions }, { headers: NO_STORE_HEADERS });
}
