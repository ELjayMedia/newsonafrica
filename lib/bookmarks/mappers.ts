import type {
  BookmarkApiPayload,
  BookmarkDomainModel,
  BookmarkFeaturedImage,
  BookmarkFeaturedImageValue,
  BookmarkHydrationMap,
  BookmarkListRow,
  BookmarkReadState,
  BookmarkRow,
  BookmarkTextValue,
} from "@/types/bookmarks"

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

export const extractText = (value: BookmarkTextValue): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && "rendered" in value) {
    const rendered = (value as { rendered?: unknown }).rendered
    return typeof rendered === "string" ? rendered : ""
  }
  return ""
}

export const extractFeaturedImage = (value: unknown): BookmarkFeaturedImageValue => {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return extractFeaturedImage(parsed)
    } catch {
      return null
    }
  }

  const obj = asRecord(value)
  if (!obj) return null

  const node = asRecord(obj.node)
  if (node) {
    return extractFeaturedImage(node)
  }

  const mediaDetails = asRecord(obj.mediaDetails)
  const mediaDetailsLegacy = asRecord(obj.media_details)
  const guid = asRecord(obj.guid)

  const url =
    (typeof obj.url === "string" && obj.url) ||
    (typeof obj.sourceUrl === "string" && obj.sourceUrl) ||
    (typeof obj.source_url === "string" && obj.source_url) ||
    (typeof mediaDetailsLegacy?.source_url === "string" && mediaDetailsLegacy.source_url) ||
    (typeof guid?.rendered === "string" && guid.rendered) ||
    undefined

  const widthValue = obj.width ?? mediaDetails?.width ?? mediaDetailsLegacy?.width
  const heightValue = obj.height ?? mediaDetails?.height ?? mediaDetailsLegacy?.height
  const width = typeof widthValue === "number" ? widthValue : undefined
  const height = typeof heightValue === "number" ? heightValue : undefined

  if (!url && width === undefined && height === undefined) {
    return null
  }

  const image: BookmarkFeaturedImage = {
    url,
    width,
    height,
  }

  return image
}

export const dbRowToDomainBookmark = (
  row: BookmarkListRow,
  metadata?: BookmarkHydrationMap[string],
): BookmarkDomainModel => {
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
    postId: row.postId,
    editionCode: normalizedEditionCode,
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

export const domainBookmarkToDbRow = (bookmark: BookmarkDomainModel): BookmarkRow => ({
  id: bookmark.id,
  userId: bookmark.userId,
  postId: bookmark.postId,
  editionCode: bookmark.editionCode ?? null,
  collectionId: bookmark.collectionId ?? null,
  title: bookmark.title,
  slug: bookmark.slug ?? null,
  excerpt: bookmark.excerpt ?? null,
  createdAt: bookmark.createdAt,
  featuredImage: bookmark.featuredImage,
  category: bookmark.category ?? null,
  tags: bookmark.tags ?? null,
  readState: bookmark.readState ?? null,
  note: bookmark.note ?? null,
})

export const apiPayloadToDomainBookmarkDraft = (payload: BookmarkApiPayload): Omit<BookmarkDomainModel, "id" | "userId" | "createdAt" | "readState"> => {
  const postId = payload.postId || payload.wpPostId || payload.wp_post_id || ""
  const editionSource = payload.editionCode ?? payload.edition_code ?? payload.country
  const collectionId = payload.collectionId ?? payload.collection_id

  return {
    postId,
    editionCode: editionSource ?? undefined,
    collectionId: collectionId ?? undefined,
    title: extractText(payload.title) || "Untitled Post",
    slug: payload.slug ?? undefined,
    excerpt: extractText(payload.excerpt) || undefined,
    featuredImage: extractFeaturedImage(payload.featuredImage ?? payload.featured_image),
    category: payload.category ?? undefined,
    tags: payload.tags ?? undefined,
    note: payload.note ?? payload.notes ?? undefined,
  }
}

export const domainBookmarkToApiPayload = (bookmark: BookmarkDomainModel): BookmarkApiPayload => ({
  postId: bookmark.postId,
  editionCode: bookmark.editionCode ?? null,
  collectionId: bookmark.collectionId ?? null,
  title: bookmark.title,
  slug: bookmark.slug ?? null,
  excerpt: bookmark.excerpt ?? null,
  featuredImage: bookmark.featuredImage,
  category: bookmark.category ?? null,
  tags: bookmark.tags ?? null,
  readState: bookmark.readState ?? null,
  note: bookmark.note ?? null,
})

export const buildHydrationPayload = (bookmarks: BookmarkListRow[]) => {
  const grouped = new Map<string, Set<string>>()

  bookmarks.forEach((bookmark) => {
    const edition = (bookmark.editionCode || DEFAULT_COUNTRY).toLowerCase()
    if (!grouped.has(edition)) {
      grouped.set(edition, new Set())
    }
    grouped.get(edition)?.add(bookmark.postId)
  })

  return Array.from(grouped.entries()).map(([country, ids]) => ({
    country,
    postIds: Array.from(ids),
  }))
}
