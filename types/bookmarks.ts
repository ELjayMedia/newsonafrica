import type { Database } from "@/types/supabase"

export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]

export const BOOKMARK_LIST_SELECT_COLUMNS =
  "id, user_id, post_id, slug, country, title, excerpt, featured_image, category, tags, read_status, notes, created_at"

export type BookmarkListRow = Pick<
  BookmarkRow,
  | "id"
  | "user_id"
  | "post_id"
  | "slug"
  | "country"
  | "title"
  | "excerpt"
  | "featured_image"
  | "category"
  | "tags"
  | "read_status"
  | "notes"
  | "created_at"
>

export interface BookmarkStats {
  total: number
  unread: number
  categories: Record<string, number>
}

export interface BookmarkPagination {
  page: number
  limit: number
  hasMore: boolean
  nextPage: number | null
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
