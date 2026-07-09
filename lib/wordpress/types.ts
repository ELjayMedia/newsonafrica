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
/* GraphQL (WPGraphQL) — the primary content transport                 */
/* ------------------------------------------------------------------ */

/**
 * These mirror the subset of the WPGraphQL schema the DAL consumes. Fields are
 * broadly nullable because WPGraphQL returns `null` for absent nodes/fields and
 * the mappers must not assume presence. `title`/`excerpt`/`content` are requested
 * with `format: RENDERED`, so they arrive as HTML strings.
 *
 * Pagination uses the WPGraphQL Offset Pagination plugin, which adds
 * `where: { offsetPagination: { offset, size } }` and exposes the total count via
 * `pageInfo.offsetPagination.total`. This lets the DAL keep page-number semantics
 * (`page`/`perPage`/`total`/`totalPages`) instead of Relay cursors.
 */

export interface WPGraphQLImageNode {
  sourceUrl?: string | null;
  altText?: string | null;
  caption?: string | null;
  mediaDetails?: { width?: number | null; height?: number | null } | null;
}

export interface WPGraphQLTermNode {
  databaseId?: number | null;
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  count?: number | null;
  parentDatabaseId?: number | null;
}

export interface WPGraphQLAuthorNode {
  databaseId?: number | null;
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  avatar?: { url?: string | null } | null;
}

export interface WPGraphQLPostNode {
  databaseId?: number | null;
  id?: string | null;
  slug?: string | null;
  date?: string | null;
  modified?: string | null;
  status?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  uri?: string | null;
  link?: string | null;
  featuredImage?: { node?: WPGraphQLImageNode | null } | null;
  categories?: { nodes?: Array<WPGraphQLTermNode | null> | null } | null;
  tags?: { nodes?: Array<WPGraphQLTermNode | null> | null } | null;
  author?: { node?: WPGraphQLAuthorNode | null } | null;
}

/** Relay `pageInfo` extended by the offset-pagination plugin's `offsetPagination.total`. */
export interface WPGraphQLPageInfo {
  hasNextPage?: boolean | null;
  endCursor?: string | null;
  offsetPagination?: { total?: number | null; hasMore?: boolean | null } | null;
}

export interface WPGraphQLConnection<TNode> {
  pageInfo?: WPGraphQLPageInfo | null;
  nodes?: Array<TNode | null> | null;
}
