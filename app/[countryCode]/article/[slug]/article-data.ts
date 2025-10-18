import { env } from "@/config/env"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapRestPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { fetchFromWp } from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import { wordpressQueries } from "@/lib/wordpress-queries"

export type FetchResponse<T> = { data: T } | { data: T; headers: Headers } | T | null

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()

export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))

export const resolveEdition = (countryCode: string): SupportedEdition | null => {
  const normalized = normalizeCountryCode(countryCode)

  if (normalized === "african") {
    return AFRICAN_EDITION
  }

  return SUPPORTED_EDITION_LOOKUP.get(normalized) ?? null
}

export const sanitizeBaseUrl = (value: string): string => value.replace(/\/$/, "")

export const resolveFetchedData = <T,>(result: FetchResponse<T[]>): T[] | null => {
  if (!result) return null

  if (Array.isArray(result)) {
    return result
  }

  if (typeof result === "object" && "data" in result && Array.isArray(result.data)) {
    return result.data
  }

  return null
}

export const looksLikeNormalizedPost = (post: unknown): post is WordPressPost => {
  if (!post || typeof post !== "object") return false

  const candidate = post as Record<string, unknown>
  return typeof candidate.title === "string"
}

export async function loadArticle(countryCode: string, slug: string): Promise<WordPressPost | null> {
  try {
    const cacheTags = buildCacheTags({
      country: countryCode,
      section: "article",
      extra: [`slug:${slug}`],
    })

    const result = await fetchFromWp<unknown[]>(countryCode, wordpressQueries.postBySlug(slug), {
      tags: cacheTags,
    })

    // Return null instead of throwing when result is null
    if (!result) {
      console.log(`[v0] No article found for ${slug} in ${countryCode}`)
      return null
    }

    const posts = resolveFetchedData(result)
    const rawPost = posts?.[0]

    if (!rawPost) {
      return null
    }

    if (looksLikeNormalizedPost(rawPost)) {
      return rawPost
    }

    return mapRestPostToWordPressPost(rawPost as any, countryCode)
  } catch (error) {
    console.error("[v0] Failed to load article", { countryCode, slug, error })

    // Re-throw so the calling layer can surface the failure to the error boundary
    throw (error instanceof Error ? error : new Error("Failed to load article"))
  }
}

export interface ArticleLoadResult {
  article: WordPressPost
  sourceCountry: string
}

const unique = (values: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = normalizeCountryCode(value)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const normalizedPrimary = normalizeCountryCode(countryCode)
  const defaultSite = normalizeCountryCode(env.NEXT_PUBLIC_DEFAULT_SITE)
  const africanEdition = normalizeCountryCode(AFRICAN_EDITION.code)

  const supportedCountryEditions = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) =>
    normalizeCountryCode(edition.code),
  )

  return unique([normalizedPrimary, defaultSite, ...supportedCountryEditions, africanEdition])
}

export async function loadArticleWithFallback(
  slug: string,
  countryPriority: string[],
): Promise<ArticleLoadResult | null> {
  const normalizedSlug = normalizeSlug(slug)

  for (const country of countryPriority) {
    const article = await loadArticle(country, normalizedSlug)
    if (article) {
      return { article, sourceCountry: country }
    }
  }

  return null
}

export { PLACEHOLDER_IMAGE_PATH }
