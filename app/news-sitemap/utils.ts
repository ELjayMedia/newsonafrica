import type { WordPressPost } from "@/lib/wordpress-api"
import { DEFAULT_COUNTRY, getArticleUrl } from "@/lib/utils/routing"

export const CACHE_CONTROL_HEADER = "public, max-age=3600, s-maxage=3600"
export const XML_DECLARATION = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
export const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
export const NEWS_NAMESPACE = "http://www.google.com/schemas/sitemap-news/0.9"
export const NEWS_SITEMAP_WINDOW_MS = 48 * 60 * 60 * 1000

export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

export const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "")

export const formatTitle = (value: string | null | undefined): string => {
  const plain = stripHtml(value ?? "").replace(/\s+/g, " ").trim()
  return escapeXml(plain)
}

export const formatKeywords = (keywords: string[]): string => {
  if (!keywords.length) {
    return ""
  }

  const normalized = keywords
    .map((keyword) => keyword.replace(/\s+/g, " ").trim())
    .filter((keyword) => keyword.length > 0)

  if (!normalized.length) {
    return ""
  }

  return escapeXml(normalized.join(", "))
}

export const deriveLanguageFromHreflang = (hreflang?: string): string => {
  if (!hreflang) {
    return "en"
  }

  const [language] = hreflang.split(/[-_]/)
  return (language || "en").toLowerCase()
}

export const getPostDate = (post: WordPressPost): Date | null => {
  const value = post.modified || post.date
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const extractKeywords = (post: WordPressPost): string[] =>
  post.categories?.nodes
    ?.map((node) => node?.name?.trim())
    .filter((name): name is string => Boolean(name && name.length > 0)) ?? []

export const filterPostsByCutoff = (
  posts: WordPressPost[],
  cutoffMs: number,
): WordPressPost[] =>
  posts
    .filter((post) => {
      const date = getPostDate(post)
      return Boolean(post.slug) && Boolean(date) && date!.getTime() >= cutoffMs
    })
    .sort((a, b) => {
      const aTime = getPostDate(a)?.getTime() ?? 0
      const bTime = getPostDate(b)?.getTime() ?? 0
      return bTime - aTime
    })

interface BuildNewsUrlElementOptions {
  baseUrl: string
  publicationName: string
  language: string
  fallbackCountry?: string
}

export const buildNewsUrlElement = (
  post: WordPressPost,
  { baseUrl, publicationName, language, fallbackCountry }: BuildNewsUrlElementOptions,
): string => {
  const publicationDate = getPostDate(post)
  if (!publicationDate || !post.slug) {
    return ""
  }

  const countryFromPost = (post as unknown as { country?: string | null })?.country
  const countryCode =
    (typeof countryFromPost === "string" && countryFromPost.trim().length > 0
      ? countryFromPost.trim().toLowerCase()
      : undefined) || fallbackCountry || DEFAULT_COUNTRY

  const loc = `${baseUrl}${getArticleUrl(post.slug, countryCode)}`
  const keywordsValue = formatKeywords(extractKeywords(post))

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${publicationDate.toISOString()}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publicationName)}</news:name>
        <news:language>${escapeXml(language)}</news:language>
      </news:publication>
      <news:publication_date>${publicationDate.toISOString()}</news:publication_date>
      <news:title>${formatTitle(post.title)}</news:title>
      <news:keywords>${keywordsValue}</news:keywords>
    </news:news>
  </url>`
}
