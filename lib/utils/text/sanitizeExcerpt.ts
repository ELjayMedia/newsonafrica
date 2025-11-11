import { decodeHtmlEntities } from "@/lib/utils/wordpressEmbeds"

const TAG_REGEX = /<[^>]*>/g
const WHITESPACE_REGEX = /\s+/g

export function sanitizeExcerpt(value?: string | null): string {
  if (!value) {
    return ""
  }

  const withoutTags = value.replace(TAG_REGEX, " ")
  const normalized = withoutTags.replace(WHITESPACE_REGEX, " ").trim()

  return decodeHtmlEntities(normalized)
}
