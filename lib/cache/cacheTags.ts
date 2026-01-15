type EditionInput = string | null | undefined
type IdentifierInput = string | number | null | undefined

const normalizeEdition = (edition: EditionInput): string => {
  if (typeof edition !== "string") {
    return "unknown"
  }

  const normalized = edition.trim().toLowerCase()
  return normalized || "unknown"
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

const normalizeSlug = (value: IdentifierInput): string => normalizeIdentifier(value).toLowerCase()

export const cacheTags = {
  home: (edition: EditionInput) => `home:${normalizeEdition(edition)}`,
  edition: (edition: EditionInput) => `edition:${normalizeEdition(edition)}`,
  category: (edition: EditionInput, slug: IdentifierInput) =>
    `category:${normalizeEdition(edition)}:${normalizeSlug(slug)}`,
  post: (edition: EditionInput, postId: IdentifierInput) =>
    `post:${normalizeEdition(edition)}:${normalizeIdentifier(postId)}`,
  author: (edition: EditionInput, slug: IdentifierInput) =>
    `author:${normalizeEdition(edition)}:${normalizeSlug(slug)}`,
  tag: (edition: EditionInput, slug: IdentifierInput) => `tag:${normalizeEdition(edition)}:${normalizeSlug(slug)}`,
} as const
