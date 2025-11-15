import type { Database } from "@/types/supabase"

export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]
export type BookmarkReadState = Database["public"]["Enums"]["bookmark_read_state"]

export const BOOKMARK_LIST_SELECT_COLUMNS =
  "id, user_id, wp_post_id, slug, edition_code, collection_id, title, excerpt, featured_image, category, tags, read_state, note, created_at"

export type BookmarkListRow = Pick<
  BookmarkRow,
  | "id"
  | "user_id"
  | "wp_post_id"
  | "slug"
  | "edition_code"
  | "collection_id"
  | "title"
  | "excerpt"
  | "featured_image"
  | "category"
  | "tags"
  | "read_state"
  | "note"
  | "created_at"
>

export interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
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
