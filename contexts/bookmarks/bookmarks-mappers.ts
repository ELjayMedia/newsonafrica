import type { BookmarkListRow, BookmarkReadState } from "@/types/bookmarks"

export interface Bookmark {
  id: string
  userId: string
  wp_post_id: string
  postId?: string
  edition_code?: string | null
  collection_id?: string | null
  collectionId?: string | null
  title: string
  slug?: string | null
  excerpt?: string | null
  createdAt: string
  featuredImage?: any
  category?: string | null
  tags?: string[] | null
  readState?: BookmarkReadState
  note?: string | null
}

export type BookmarkHydrationMap = Record<
  string,
  {
    id: string
    country?: string
    slug?: string
    title?: string
    excerpt?: string
    featuredImage?: Bookmark["featuredImage"]
  }
>

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

export const extractText = (value: unknown): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && "rendered" in (value as Record<string, unknown>)) {
    const rendered = (value as { rendered?: unknown }).rendered
    return typeof rendered === "string" ? rendered : ""
  }
  return ""
}

export const extractFeaturedImage = (value: unknown): Bookmark["featuredImage"] => {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return extractFeaturedImage(parsed)
    } catch {
      return null
    }
  }
  if (typeof value !== "object" || value === null) return null
  const obj = value as Record<string, any>
  if (obj.node) {
    return extractFeaturedImage(obj.node)
  }

  const url =
    obj.url ||
    obj.sourceUrl ||
    obj.source_url ||
    obj.media_details?.source_url ||
    obj.guid?.rendered
  const width = obj.width || obj.mediaDetails?.width || obj.media_details?.width
  const height = obj.height || obj.mediaDetails?.height || obj.media_details?.height

  if (!url && !width && !height) {
    return null
  }

  return {
    url: url || undefined,
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  }
}

export const formatBookmarkRow = (
  row: BookmarkListRow,
  metadata?: BookmarkHydrationMap[string],
): Bookmark => {
  const metaTitle = metadata?.title ? extractText(metadata.title) : ""
  const metaExcerpt = metadata?.excerpt ? extractText(metadata.excerpt) : ""
  const title = extractText(row.title) || metaTitle || "Untitled Post"
  const slug = row.slug || metadata?.slug || ""
  const excerpt = extractText(row.excerpt) || metaExcerpt || ""
  const featuredImage =
    extractFeaturedImage(row.featuredImage) || extractFeaturedImage(metadata?.featuredImage) || null

  const readState = typeof row.readState === "string" ? (row.readState as BookmarkReadState) : undefined
  const editionSource = row.editionCode || metadata?.country || DEFAULT_COUNTRY
  const normalizedEditionCode =
    typeof editionSource === "string" && editionSource.trim().length
      ? editionSource.trim().toLowerCase()
      : undefined

  return {
    id: row.id,
    userId: row.userId,
    wp_post_id: row.postId,
    postId: row.postId,
    edition_code: normalizedEditionCode,
    collection_id: row.collectionId || undefined,
    collectionId: row.collectionId || undefined,
    title,
    slug: slug || undefined,
    excerpt: excerpt || undefined,
    createdAt: row.createdAt,
    featuredImage,
    category: row.category || undefined,
    tags: row.tags || undefined,
    readState,
    note: row.note || undefined,
  }
}

export const getRowPostId = (row: BookmarkListRow): string => row.postId

export const buildHydrationPayload = (bookmarks: BookmarkListRow[]) => {
  const grouped = new Map<string, Set<string>>()

  bookmarks.forEach((bookmark) => {
    const edition = (bookmark.editionCode || DEFAULT_COUNTRY).toLowerCase()
    if (!grouped.has(edition)) {
      grouped.set(edition, new Set())
    }
    grouped.get(edition)!.add(bookmark.postId)
  })

  return Array.from(grouped.entries()).map(([country, ids]) => ({
    country,
    postIds: Array.from(ids),
  }))
}
