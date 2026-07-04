/**
 * Pure input-normalization helpers for the search layer (NOA-93).
 * Client-safe and side-effect free so both the server query layer, the
 * suggest API route and the search page can share one set of rules —
 * unit tested in `lib/search/params.test.ts`.
 */
import { isValidCountry, type CountryCode } from "@/lib/countries";

/** Longest query we forward to Postgres — anything beyond this adds no signal. */
export const MAX_QUERY_LENGTH = 200;

/** Minimum query length before we bother the suggestions RPC. */
export const MIN_SUGGESTION_QUERY_LENGTH = 2;

export const DEFAULT_SEARCH_PER_PAGE = 12;
export const MAX_SEARCH_PER_PAGE = 50;

export const DEFAULT_SUGGESTION_LIMIT = 8;
export const MAX_SUGGESTION_LIMIT = 10;

/**
 * Trim, collapse internal whitespace and cap the length of a raw query
 * value (e.g. a `?q=` search param). Returns `""` for non-string input.
 */
export function normalizeSearchQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/**
 * Validate an optional country filter against the supported editions.
 * Anything unknown (including `"all"`, `""`, arrays) means "no filter".
 */
export function normalizeCountryFilter(raw: unknown): CountryCode | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return isValidCountry(code) ? code : null;
}

/** Clamp a raw page value (number or `?page=` string) to a positive integer. */
export function normalizeSearchPage(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

/** Clamp a per-page value to [1, MAX_SEARCH_PER_PAGE]. */
export function normalizeSearchPerPage(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_SEARCH_PER_PAGE;
  return Math.min(Math.floor(parsed), MAX_SEARCH_PER_PAGE);
}

/** Clamp a suggestion limit to [1, MAX_SUGGESTION_LIMIT]. */
export function normalizeSuggestionLimit(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_SUGGESTION_LIMIT;
  return Math.min(Math.floor(parsed), MAX_SUGGESTION_LIMIT);
}

/**
 * Build the canonical `/search` URL for a query + optional filters. Used by
 * the search box (submit), the results page (country filter links) and
 * pagination so they all agree on param names.
 */
export function buildSearchUrl({
  query,
  country,
  page,
}: {
  query: string;
  country?: CountryCode | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const q = normalizeSearchQuery(query);
  if (q) params.set("q", q);
  if (country) params.set("country", country);
  if (page && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
