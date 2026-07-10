/**
 * Typed search query layer (NOA-93) over the Supabase `content_index` FTS
 * schema (NOA-87 + 20260702150000_search_pagination.sql).
 *
 * Server-only: uses the cookie-free public Supabase client so calling
 * routes aren't forced dynamic by cookie access (see lib/supabase/public.ts
 * and docs/caching-strategy.md). Input normalization lives in the pure,
 * client-safe `lib/search/params.ts`.
 *
 * Follows the DAL resilience convention (see lib/dal/most-read.ts): a
 * Supabase failure logs and degrades to empty results rather than throwing,
 * so search surfaces render an empty state instead of a 500.
 */
import "server-only";

import { createLogger } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";
import type { CountryCode } from "@/lib/countries";
import {
  MIN_SUGGESTION_QUERY_LENGTH,
  normalizeCountryFilter,
  normalizeSearchPage,
  normalizeSearchPerPage,
  normalizeSearchQuery,
  normalizeSuggestionLimit,
} from "@/lib/search/params";
import type { SearchResult, SearchResultPage, SearchSuggestion } from "@/lib/search/types";

export type { SearchResult, SearchResultPage, SearchSuggestion } from "@/lib/search/types";

const log = createLogger("search");

export interface SearchContentParams {
  query: string;
  country?: CountryCode | string | null;
  page?: number;
  perPage?: number;
}

export interface SearchSuggestionsParams {
  query: string;
  country?: CountryCode | string | null;
  limit?: number;
}

function emptyPage(query: string, country: CountryCode | null, page: number, perPage: number): SearchResultPage {
  return { items: [], query, country, page, perPage, total: 0, totalPages: 0, hasNextPage: false };
}

/**
 * Ranked full-text search with total-count pagination, backed by the
 * `search_content` RPC (weighted tsvector: title > excerpt/tags/categories >
 * body; ties broken by recency).
 */
export async function searchContent(params: SearchContentParams): Promise<SearchResultPage> {
  const query = normalizeSearchQuery(params.query);
  const country = normalizeCountryFilter(params.country);
  const page = normalizeSearchPage(params.page);
  const perPage = normalizeSearchPerPage(params.perPage);

  if (!query) return emptyPage(query, country, 1, perPage);

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("search_content", {
      search_query: query,
      country_filter: country,
      limit_count: perPage,
      offset_count: (page - 1) * perPage,
    });

    if (error) {
      log.error("search_content RPC failed", { err: error });
      return emptyPage(query, country, page, perPage);
    }

    const rows = data ?? [];
    // Every row carries the same windowed match count (total_count) — exact
    // totals + numbered pagination without a second count query.
    const total = rows[0]?.total_count ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / perPage) : 0;

    const items: SearchResult[] = rows.map((row) => ({
      id: row.id,
      wpPostId: row.wp_post_id,
      slug: row.slug,
      country: row.edition_code as CountryCode,
      title: row.title,
      excerpt: row.excerpt ?? "",
      url: row.url_path,
      featuredImageUrl: row.featured_image_url,
      author: row.author,
      categories: row.categories,
      tags: row.tags,
      publishedAt: row.published_at,
      rank: row.rank,
    }));

    return { items, query, country, page, perPage, total, totalPages, hasNextPage: page < totalPages };
  } catch (error) {
    log.error("searchContent failed", { err: error });
    return emptyPage(query, country, page, perPage);
  }
}

/**
 * Title suggestions for the search-as-you-type box, backed by the
 * `search_suggestions` RPC (trigram-indexed substring match, prefix hits
 * first). Returns `[]` for queries shorter than MIN_SUGGESTION_QUERY_LENGTH.
 */
export async function searchSuggestions(params: SearchSuggestionsParams): Promise<SearchSuggestion[]> {
  const query = normalizeSearchQuery(params.query);
  const country = normalizeCountryFilter(params.country);
  const limit = normalizeSuggestionLimit(params.limit);

  if (query.length < MIN_SUGGESTION_QUERY_LENGTH) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("search_suggestions", {
      search_query: query,
      country_filter: country,
      limit_count: limit,
    });

    if (error) {
      log.error("search_suggestions RPC failed", { err: error });
      return [];
    }

    return (data ?? []).map((row) => ({
      title: row.title,
      country: row.edition_code as CountryCode,
      slug: row.slug,
      url: row.url_path,
    }));
  } catch (error) {
    log.error("searchSuggestions failed", { err: error });
    return [];
  }
}
