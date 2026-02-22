import { AFRICAN_EDITION } from "@/lib/editions"

type EditionInput = string | null | undefined
type IdentifierInput = string | number | null | undefined

const FALLBACK_EDITION = AFRICAN_EDITION.code

const normalizeEdition = (edition: EditionInput): string => {
  if (typeof edition !== "string") {
    return FALLBACK_EDITION
  }

  const normalized = edition.trim().toLowerCase()
  return normalized || FALLBACK_EDITION
}

const normalizeIdentifier = (value: IdentifierInput): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed) {
      return trimmed.toLowerCase()
    }
  }

  return "unknown"
}

const editionScope = (edition: EditionInput, scope: string): string =>
  `edition:${normalizeEdition(edition)}:${scope}`

const editionEntity = (edition: EditionInput, scope: string, id: IdentifierInput): string =>
  `${editionScope(edition, scope)}:${normalizeIdentifier(id)}`

export const cacheTags = {
  edition: (edition: EditionInput) => `edition:${normalizeEdition(edition)}`,
  home: (edition: EditionInput) => `home:${normalizeEdition(edition)}`,
  posts: (edition: EditionInput) => editionScope(edition, "posts"),
  post: (edition: EditionInput, postId: IdentifierInput) => editionEntity(edition, "post", postId),
  postSlug: (edition: EditionInput, slug: IdentifierInput) => editionEntity(edition, "post-slug", slug),
  categories: (edition: EditionInput) => editionScope(edition, "categories"),
  category: (edition: EditionInput, slug: IdentifierInput) => editionEntity(edition, "category", slug),
  author: (edition: EditionInput, slug: IdentifierInput) => editionEntity(edition, "author", slug),
  tags: (edition: EditionInput) => editionScope(edition, "tags"),
  tag: (edition: EditionInput, slug: IdentifierInput) => editionEntity(edition, "tag", slug),
  comments: (edition: EditionInput, postId: IdentifierInput) => editionEntity(edition, "comments", postId),
  bookmarks: (edition: EditionInput) => editionScope(edition, "bookmarks"),
  bmUser: (userId: IdentifierInput) => `bm:user:${normalizeIdentifier(userId)}`,
  bmCollection: (collectionId: IdentifierInput) => `bm:collection:${normalizeIdentifier(collectionId)}`,
} as const
