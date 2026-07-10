/**
 * Typed shapes for the WordPress REST API v2 (NOA-85).
 *
 * These mirror the subset of fields the DAL (NOA-86) actually consumes —
 * not the full WP schema. `_embedded` is only present when a request is
 * made with `?_embed=1` (used to pull in featured media, author and terms
 * in a single round trip).
 */

export interface WPRendered {
  rendered: string;
  protected?: boolean;
}

export interface WPRestFeaturedMedia {
  id: number;
  source_url: string;
  alt_text?: string;
  media_details?: {
    width?: number;
    height?: number;
  };
}

export interface WPRestTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  count?: number;
  description?: string;
  parent?: number;
}

export interface WPRestAuthor {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_urls?: Record<string, string>;
  url?: string;
}

export interface WPRestPost {
  id: number;
  date: string;
  date_gmt?: string;
  modified: string;
  modified_gmt?: string;
  slug: string;
  status: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  sticky?: boolean;
  _embedded?: {
    author?: WPRestAuthor[];
    "wp:featuredmedia"?: WPRestFeaturedMedia[];
    "wp:term"?: WPRestTerm[][];
  };
}

export interface WPRestCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  parent?: number;
}

export interface WPRestTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

/** Pagination metadata WordPress returns via `X-WP-Total` / `X-WP-TotalPages` headers. */
export interface WPRestPageInfo {
  total: number;
  totalPages: number;
}

export interface WPRestListResult<T> {
  items: T[];
  pageInfo: WPRestPageInfo;
}

/* ------------------------------------------------------------------ */
/* GraphQL (WPGraphQL)                                                 */
/* ------------------------------------------------------------------ */

export interface WPGraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface WPGraphQLImage {
  sourceUrl?: string | null;
  altText?: string | null;
}

export interface WPGraphQLPostNode {
  id: string;
  databaseId: number;
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  content?: string;
  featuredImage?: { node?: WPGraphQLImage | null } | null;
  categories?: { nodes: Array<{ id: string; databaseId: number; name: string; slug: string }> } | null;
  tags?: { nodes: Array<{ id: string; databaseId: number; name: string; slug: string }> } | null;
  author?: { node?: { id: string; databaseId: number; name: string; slug: string } | null } | null;
}

export interface WPGraphQLPostsConnection {
  pageInfo: WPGraphQLPageInfo;
  nodes: WPGraphQLPostNode[];
}
