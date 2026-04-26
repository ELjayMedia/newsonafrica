import DOMPurify from "isomorphic-dompurify"

const MOST_READ_CLASS_BLOCK_REGEX =
  /<(section|div|aside)\b[^>]*class\s*=\s*("|')[^"']*most-read[^"']*\2[^>]*>[\s\S]*?<\/\1>/gi
const MOST_READ_SECTION_WITH_HEADING_REGEX =
  /<(section|div|aside)\b[^>]*>[\s\S]*?<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>[\s\S]*?<\/\1>/gi
const MOST_READ_HEADING_AND_LIST_REGEX =
  /<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>\s*(<(ul|ol)\b[^>]*>[\s\S]*?<\/(ul|ol)>\s*)?/gi
const MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX =
  /<p\b[^>]*>\s*(?:<strong>|<b>)?\s*Most\s*Read\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*(?:<p\b[^>]*>\s*<a\b[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*){1,12}/gi

export function sanitizeArticleHtml(html: string): string {
  if (!html) {
    return ""
  }

  // DOMPurify strips all script, event-handler, and javascript: URL attack
  // vectors using a full DOM parser — far more robust than regex. iframes are
  // explicitly allowed for embedded video; style attributes are forbidden to
  // prevent CSS-based data exfiltration.
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "loading", "decoding", "target"],
    FORBID_ATTR: ["style"],
  })

  // Strip WordPress "Most Read" promotional blocks that have no place in the
  // article body.
  return clean
    .replace(MOST_READ_CLASS_BLOCK_REGEX, "")
    .replace(MOST_READ_SECTION_WITH_HEADING_REGEX, "")
    .replace(MOST_READ_HEADING_AND_LIST_REGEX, "")
    .replace(MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX, "")
}
