import type {
  BookmarkDomainModel as Bookmark,
  BookmarkHydrationMap,
  BookmarkListRow,
  BookmarkTextValue,
} from "@/types/bookmarks"
import {
  buildHydrationPayload,
  dbRowToDomainBookmark,
  extractFeaturedImage,
  extractText,
  apiPayloadToDomainBookmarkDraft,
} from "@/lib/bookmarks/mappers"

export type { Bookmark, BookmarkHydrationMap }

export const formatBookmarkRow = (row: BookmarkListRow, metadata?: BookmarkHydrationMap[string]): Bookmark =>
  dbRowToDomainBookmark(row, metadata)

export const getRowPostId = (row: BookmarkListRow): string => row.postId

export { buildHydrationPayload, extractFeaturedImage, extractText, apiPayloadToDomainBookmarkDraft }

export type { BookmarkTextValue }
