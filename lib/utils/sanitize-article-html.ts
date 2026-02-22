const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
const EVENT_HANDLER_ATTR_REGEX = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_ATTR_REGEX = /\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi

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
}
