/**
 * Search domain types (NOA-93). Client-safe — imported by both the
 * server-side query layer (`lib/search/server.ts`) and client components
 * (the search box consumes `SearchSuggestion` from the suggest API).
 */
import type { CountryCode } from "@/lib/countries";

/** One ranked hit from the `search_content` RPC, normalized for the UI. */
export interface SearchResult {
  id: string;
  wpPostId: number;
  slug: string;
  country: CountryCode;
  title: string;
  excerpt: string;
  /** Site-relative article URL, e.g. `/sz/article/some-story`. */
  url: string;
  featuredImageUrl: string | null;
  author: string | null;
  categories: string[];
  tags: string[];
  publishedAt: string;
  /** ts_rank_cd relevance score — higher is more relevant. */
  rank: number;
}

export interface SearchResultPage {
  items: SearchResult[];
  query: string;
  country: CountryCode | null;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

/** One type-ahead suggestion (`search_suggestions` RPC / suggest API). */
export interface SearchSuggestion {
  title: string;
  country: CountryCode;
  slug: string;
  /** Site-relative article URL to navigate to when selected. */
  url: string;
}
