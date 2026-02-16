import type { Database } from "@/types/supabase"

export type BookmarkTableRow = Database["public"]["Tables"]["bookmarks"]["Row"]

type BookmarkPostId = BookmarkTableRow["wp_post_id"]

export type BookmarkReadState = NonNullable<BookmarkTableRow["read_state"]>
export type BookmarkReadStateKey = BookmarkReadState | "unknown"

export interface BookmarkFeaturedImage {
  url?: string
  width?: number
  height?: number
}

export type BookmarkFeaturedImageValue = BookmarkFeaturedImage | null

export type BookmarkTextValue = string | { rendered?: unknown } | null | undefined

export interface BookmarkHydrationMetadata {
  id: string
  country?: string
  slug?: string
  title?: BookmarkTextValue
  excerpt?: BookmarkTextValue
  featuredImage?: BookmarkFeaturedImageValue | Record<string, unknown> | string
}

export type BookmarkHydrationMap = Record<string, BookmarkHydrationMetadata>

export interface BookmarkDomainModel {
  id: BookmarkTableRow["id"]
  userId: BookmarkTableRow["user_id"]
  postId: BookmarkPostId
  editionCode?: BookmarkTableRow["edition_code"]
  collectionId?: BookmarkTableRow["collection_id"]
  title: string
  slug?: BookmarkTableRow["slug"]
  excerpt?: BookmarkTableRow["excerpt"]
  createdAt: BookmarkTableRow["created_at"]
  featuredImage: BookmarkFeaturedImageValue
  category?: BookmarkTableRow["category"]
  tags?: BookmarkTableRow["tags"]
  readState?: BookmarkReadState
  note?: BookmarkTableRow["note"]
}

export interface BookmarkApiPayload {
  postId?: string
  wpPostId?: string
  wp_post_id?: string
  editionCode?: string | null
  edition_code?: string | null
  country?: string | null
  collectionId?: string | null
  collection_id?: string | null
  title?: BookmarkTextValue
  slug?: string | null
  excerpt?: BookmarkTextValue
  featuredImage?: Record<string, unknown> | BookmarkFeaturedImageValue | string
  featured_image?: Record<string, unknown> | BookmarkFeaturedImageValue | string
  category?: string | null
  tags?: string[] | null
  readState?: BookmarkReadState | null
  status?: BookmarkReadState | null
  note?: string | null
  notes?: string | null
}

export interface BookmarkRow {
  id: BookmarkTableRow["id"]
  userId: BookmarkTableRow["user_id"]
  postId: BookmarkPostId
  editionCode: BookmarkTableRow["edition_code"]
  collectionId: BookmarkTableRow["collection_id"]
  title: BookmarkTableRow["title"]
  slug: BookmarkTableRow["slug"]
  excerpt: BookmarkTableRow["excerpt"]
  featuredImage: Record<string, unknown> | null
  category: BookmarkTableRow["category"]
  tags: BookmarkTableRow["tags"]
  readState: BookmarkTableRow["read_state"]
  note: BookmarkTableRow["note"]
  createdAt: BookmarkTableRow["created_at"]
}

export const BOOKMARK_LIST_SELECT_COLUMNS = [
  "id",
  "user_id:userId",
  "wp_post_id:postId",
  "slug",
  "edition_code:editionCode",
  "collection_id:collectionId",
  "title",
  "excerpt",
  "featured_image:featuredImage",
  "category",
  "tags",
  "read_state:readState",
  "note:note",
  "created_at:createdAt",
].join(", ")

export type BookmarkListRow = Pick<
  BookmarkRow,
  | "id"
  | "userId"
  | "postId"
  | "slug"
  | "editionCode"
  | "collectionId"
  | "title"
  | "excerpt"
  | "featuredImage"
  | "category"
  | "tags"
  | "readState"
  | "note"
  | "createdAt"
>

export interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
  readStates: Record<BookmarkReadStateKey, number>
  collections: Record<string, number>
}

export interface BookmarkPagination {
  limit: number
  hasMore: boolean
  nextCursor: string | null
}

export interface BookmarkListPayload {
  bookmarks: BookmarkListRow[]
  stats: BookmarkStats | null
  pagination: BookmarkPagination
}

export interface BookmarkStatsDelta {
  total: number
  unread: number
  categories: Record<string, number>
  readStates: Record<BookmarkReadStateKey, number>
  collections: Record<string, number>
}

export interface BookmarkMutationPayload {
  added?: BookmarkListRow[]
  updated?: BookmarkListRow[]
  removed?: BookmarkListRow[]
  statsDelta: BookmarkStatsDelta
}

export type BookmarkCollectionRow = Database["public"]["Tables"]["bookmark_collections"]["Row"]
export type BookmarkCollectionInsert = Database["public"]["Tables"]["bookmark_collections"]["Insert"]
export type BookmarkCollectionUpdate = Database["public"]["Tables"]["bookmark_collections"]["Update"]

export type BookmarkUserCounterRow = Database["public"]["Tables"]["bookmark_user_counters"]["Row"]
export type BookmarkUserCounterInsert = Database["public"]["Tables"]["bookmark_user_counters"]["Insert"]
export type BookmarkUserCounterUpdate = Database["public"]["Tables"]["bookmark_user_counters"]["Update"]
