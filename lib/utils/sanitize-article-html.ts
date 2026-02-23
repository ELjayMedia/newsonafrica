const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
const EVENT_HANDLER_ATTR_REGEX = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_ATTR_REGEX = /\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi
const MOST_READ_CLASS_BLOCK_REGEX =
  /<(section|div|aside)\b[^>]*class\s*=\s*("|')[^"']*most-read[^"']*\2[^>]*>[\s\S]*?<\/\1>/gi
const MOST_READ_SECTION_WITH_HEADING_REGEX =
  /<(section|div|aside)\b[^>]*>[\s\S]*?<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>[\s\S]*?<\/\1>/gi
const MOST_READ_HEADING_AND_LIST_REGEX =
  /<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>\s*(<(ul|ol)\b[^>]*>[\s\S]*?<\/(ul|ol)>\s*)?/gi
const MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX =
  /<p\b[^>]*>\s*(?:<strong>|<b>)?\s*Most\s*Read\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*(?:<p\b[^>]*>\s*<a\b[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*){1,12}/gi

/**
 * Minimal server-safe article HTML sanitization.
 *
 * NOTE: This intentionally avoids DOM-based sanitizer dependencies so the helper
 * can be safely executed in server components during Next.js build/runtime.
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html) {
    return ""
  }

  return html
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(STYLE_TAG_REGEX, "")
    .replace(EVENT_HANDLER_ATTR_REGEX, "")
    .replace(JAVASCRIPT_URL_ATTR_REGEX, "")
    .replace(MOST_READ_CLASS_BLOCK_REGEX, "")
    .replace(MOST_READ_SECTION_WITH_HEADING_REGEX, "")
    .replace(MOST_READ_HEADING_AND_LIST_REGEX, "")
    .replace(MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX, "")
}
