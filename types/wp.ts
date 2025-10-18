// ✅ Canonical WordPress types (single source of truth)
// Keep only interface/type definitions here to avoid circular deps.
// Re-export non-core result types from their existing modules for compatibility.

export interface WordPressMediaDetails {
  width?: number
  height?: number
}

export interface WordPressMediaNode {
  sourceUrl?: string
  altText?: string
  caption?: string
  mediaDetails?: WordPressMediaDetails
}

export interface WordPressMedia {
  node?: WordPressMediaNode
}

export interface WordPressAuthorNode {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
  description?: string
  avatar?: { url?: string }
}

export interface WordPressAuthor {
  id?: number
  databaseId?: number
  name: string
  slug: string
  description?: string
  avatar?: { url?: string }
  node?: WordPressAuthorNode
}

export interface WordPressCategory {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
  description?: string
  count?: number
  parent?: number | null
}

export interface WordPressCategoryConnection {
  nodes?: WordPressCategory[]
}

export interface WordPressTag {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
}

export interface WordPressTagConnection {
  nodes?: WordPressTag[]
}

export interface WordPressPost {
  id?: string
  databaseId?: number
  globalRelayId?: string
  slug?: string
  uri?: string
  link?: string
  title?: string
  excerpt?: string
  content?: string
  date?: string
  modified?: string
  author?: WordPressAuthor
  featuredImage?: WordPressMedia
  categories?: WordPressCategoryConnection
  tags?: WordPressTagConnection
}

export interface WordPressPagination {
  total?: number
  totalPages?: number
  perPage?: number
  currentPage?: number
  hasNextPage?: boolean
  endCursor?: string | null
}

export type WordPressPaginationInfo = WordPressPagination

// ---- Compatibility re-exports for non-core result shapes still defined elsewhere
export type {
  WordPressAuthor as _CompatWordPressAuthor, // optional alias if some modules import from the lib path
  WordPressCategory as _CompatWordPressCategory,
  WordPressTag as _CompatWordPressTag,
} // no runtime impact

// Results/util types that still live under lib — re-export to avoid breaking imports
export type {
  CategoryPostsResult,
  FrontPageSlicesResult,
  PaginatedPostsResult,
  AggregatedHomeData,
} from "@/lib/wordpress/types"

export type {
  FetchTaggedPostsInput,
  FetchTaggedPostsResult,
} from "@/lib/wordpress/posts"
