import type { Database } from "@/types/supabase"

export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"]

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
  bookmarks: BookmarkRow[]
  stats: BookmarkStats | null
  pagination: BookmarkPagination
}
