const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
const TAG_REGEX = /<[^>]+>/g
const ENTITY_REGEX = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

const decodeHtmlEntity = (entity: string): string => {
  if (!entity) {
    return ""
  }

  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const codePoint = Number.parseInt(entity.slice(2), 16)
    return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint)
  }

  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10)
    return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint)
  }

  return HTML_ENTITIES[entity] ?? ""
}

const decodeHtmlEntities = (value: string): string =>
  value.replace(ENTITY_REGEX, (_, entity: string) => decodeHtmlEntity(entity) || " ")

/**
 * Remove HTML tags and decode a small subset of entities.
 */
export function stripHtml(html: string): string {
  if (!html) {
    return ""
  }

  const withoutDangerousTags = html.replace(SCRIPT_TAG_REGEX, " ").replace(STYLE_TAG_REGEX, " ")
  const withoutTags = withoutDangerousTags.replace(TAG_REGEX, " ")
  const decoded = decodeHtmlEntities(withoutTags)

  return decoded.replace(/\s+/g, " ").trim()
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Highlight occurrences of the query terms using a <mark> tag.
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!text || !query) {
    return text
  }

  const normalizedTerms = Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0),
    ),
  )

  if (normalizedTerms.length === 0) {
    return text
  }

  const sortedTerms = [...normalizedTerms].sort((a, b) => b.length - a.length)

  return sortedTerms.reduce((acc, term) => {
    const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi")
    return acc.replace(
      pattern,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>',
    )
  }, text)
}
