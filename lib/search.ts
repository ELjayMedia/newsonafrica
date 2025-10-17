const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
const HTML_TAG_REGEX = /<[^>]*>/g
const ENTITY_REGEX = /&[^;]+;/g
const WHITESPACE_REGEX = /\s+/g

const MARK_TEMPLATE = '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>'

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function stripHtml(html: string): string {
  if (!html) {
    return ""
  }

  return html
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(STYLE_TAG_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(ENTITY_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim()
}

export function highlightSearchTerms(text: string, query: string): string {
  if (!text || !query) {
    return text
  }

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1)

  if (terms.length === 0) {
    return text
  }

  return terms.reduce((highlighted, term) => {
    const pattern = new RegExp(`\\b(${escapeRegExp(term)})\\b`, "gi")
    return highlighted.replace(pattern, MARK_TEMPLATE)
  }, text)
}
