const HTTP_PROTOCOLS = new Set(["http:", "https:"])
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g
const HTML_TAG_PATTERN = /<\s*\/?\s*[a-z!][^>]*>/i
const INLINE_EVENT_HANDLER_PATTERN = /<[^>]*\son[a-z]+\s*=/i

export function isAllowedHttpUrl(url: string): boolean {
  const value = url.trim()
  if (!value || !ABSOLUTE_HTTP_URL_PATTERN.test(value)) return false

  try {
    const parsed = new URL(value)
    return HTTP_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function findMarkdownLinks(body: string): Array<{ label: string; url: string }> {
  const matches: Array<{ label: string; url: string }> = []
  for (const match of body.matchAll(MARKDOWN_LINK_PATTERN)) {
    const label = match[1]?.trim()
    const url = match[2]?.trim()
    if (!label || !url) continue
    matches.push({ label, url })
  }
  return matches
}

export function containsDisallowedHtml(body: string): boolean {
  return HTML_TAG_PATTERN.test(body) || INLINE_EVENT_HANDLER_PATTERN.test(body)
}

export function validateRichTextFormatting(body: string): string | null {
  if (containsDisallowedHtml(body)) {
    return "Rich-text comments do not allow raw HTML tags or inline event handlers"
  }

  for (const link of findMarkdownLinks(body)) {
    if (!isAllowedHttpUrl(link.url)) {
      return "Rich-text links must use http:// or https:// URLs"
    }
  }

  return null
}
