import { AFRICAN_EDITION } from "./editions"

type EditionInput = string | null | undefined

type IdentifierInput = string | number | null | undefined

const FALLBACK_EDITION = AFRICAN_EDITION.code

const normalizeEdition = (value: EditionInput): string => {
  if (typeof value !== "string") {
    return FALLBACK_EDITION
  }

  const normalized = value.trim().toLowerCase()
  return normalized || FALLBACK_EDITION
}

const normalizeIdentifier = (value: IdentifierInput): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return "unknown"
}

const editionScope = (edition: EditionInput, scope: string): string => {
  return `edition:${normalizeEdition(edition)}:${scope}`
}

const editionEntity = (edition: EditionInput, scope: string, id: IdentifierInput): string => {
  return `${editionScope(edition, scope)}:${normalizeIdentifier(id)}`
}

export const cacheTags = {
  edition(edition: EditionInput): string {
    return `edition:${normalizeEdition(edition)}`
  },
  posts(edition: EditionInput): string {
    return editionScope(edition, "posts")
  },
  post(edition: EditionInput, id: IdentifierInput): string {
    return editionEntity(edition, "post", id)
  },
  postSlug(edition: EditionInput, slug: IdentifierInput): string {
    return editionEntity(edition, "post-slug", slug)
  },
  categories(edition: EditionInput): string {
    return editionScope(edition, "categories")
  },
  category(edition: EditionInput, id: IdentifierInput): string {
    return editionEntity(edition, "category", id)
  },
  tags(edition: EditionInput): string {
    return editionScope(edition, "tags")
  },
  tag(edition: EditionInput, identifier: IdentifierInput): string {
    return editionEntity(edition, "tag", identifier)
  },
  comments(edition: EditionInput, postId: IdentifierInput): string {
    return editionEntity(edition, "comments", postId)
  },
  bookmarks(edition: EditionInput): string {
    return editionScope(edition, "bookmarks")
  },
  bmUser(userId: IdentifierInput): string {
    return `bm:user:${normalizeIdentifier(userId)}`
  },
}

type CacheTags = typeof cacheTags

export type CacheTagBuilder = {
  [K in keyof CacheTags]: CacheTags[K]
}
