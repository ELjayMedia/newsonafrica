import "server-only"

import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"

export function normalizePostContent(html: string, countryCode = "sz"): string {
  const normalized = html.trim()
  if (!normalized) {
    return ""
  }

  return transformWordPressEmbeds(sanitizeArticleHtml(rewriteLegacyLinks(normalized, countryCode)))
}
