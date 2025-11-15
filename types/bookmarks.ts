import type { Database } from "@/types/supabase"

type BookmarkTableRow = Database["public"]["Tables"]["bookmarks"]["Row"]

export type BookmarkReadState = NonNullable<BookmarkTableRow["read_state"]>

export interface BookmarkRow {
  id: BookmarkTableRow["id"]
  userId: BookmarkTableRow["user_id"]
  postId: BookmarkTableRow["post_id"]
  country: BookmarkTableRow["country"]
  title: BookmarkTableRow["title"]
  slug: BookmarkTableRow["slug"]
  excerpt: BookmarkTableRow["excerpt"]
  featuredImage: BookmarkTableRow["featured_image"]
  category: BookmarkTableRow["category"]
  tags: BookmarkTableRow["tags"]
  readState: BookmarkTableRow["read_state"]
  notes: BookmarkTableRow["notes"]
  createdAt: BookmarkTableRow["created_at"]
}

export const BOOKMARK_LIST_SELECT_COLUMNS = [
  "id",
  "user_id:userId",
  "post_id:postId",
  "slug",
  "country",
  "title",
  "excerpt",
  "featured_image:featuredImage",
  "category",
  "tags",
  "read_state:readState",
  "notes",
  "created_at:createdAt",
].join(", ")

export type BookmarkListRow = Pick<
  BookmarkRow,
  | "id"
  | "userId"
  | "postId"
  | "slug"
  | "country"
  | "title"
  | "excerpt"
  | "featuredImage"
  | "category"
  | "tags"
  | "readState"
  | "notes"
  | "createdAt"
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
