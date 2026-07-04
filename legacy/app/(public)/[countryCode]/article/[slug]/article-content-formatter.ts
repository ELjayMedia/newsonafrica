import "server-only"

import { unstable_cache } from "next/cache"

import type { ArticleBlock } from "@/lib/article/article-body-blocks"
import { parseHtmlToBlocks } from "@/lib/article/article-body-blocks"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"

type FormatArticleBodyParams = {
  country: string
  canonicalSlug: string
  version?: string | null
  html: string
  preview?: boolean
}

type FormattedArticleBody = {
  sanitizedHtml: string
  blocks: ArticleBlock[]
}

const DEFAULT_VERSION = "latest"
const ARTICLE_BODY_REVALIDATE_SECONDS = 300

const sanitizeCacheSegment = (value: string): string => {
  const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-")
  return sanitized.length > 0 ? sanitized : DEFAULT_VERSION
}

const buildFallbackBody = (): FormattedArticleBody => {
  const sanitizedHtml = "<p>This article has no body content yet.</p>"
  return { sanitizedHtml, blocks: parseHtmlToBlocks(sanitizedHtml) }
}

const formatBody = (html: string): FormattedArticleBody => {
  const trimmed = html?.trim()

  if (!trimmed) {
    return buildFallbackBody()
  }

  const sanitizedHtml = sanitizeArticleHtml(trimmed)
  return { sanitizedHtml, blocks: parseHtmlToBlocks(sanitizedHtml) }
}

export async function formatArticleBodyCached({
  country,
  canonicalSlug,
  version,
  html,
  preview = false,
}: FormatArticleBodyParams): Promise<FormattedArticleBody> {
  if (preview) {
    return formatBody(html)
  }

  const keyParts = [
    "article-body-formatter",
    sanitizeCacheSegment(country),
    sanitizeCacheSegment(canonicalSlug),
    sanitizeCacheSegment(version ?? DEFAULT_VERSION),
  ]

  const cachedFormatter = unstable_cache(async () => formatBody(html), keyParts, {
    revalidate: ARTICLE_BODY_REVALIDATE_SECONDS,
  })

  return cachedFormatter()
}
