import { env } from "@/config/env"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { fetchWordPressGraphQL } from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress-queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()

export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))

export const AFRICAN_ROUTE_ALIAS = "african"

export const normalizeRouteCountry = (country: string): string => {
  const normalized = normalizeCountryCode(country)

  if (normalized === AFRICAN_ROUTE_ALIAS) {
    return AFRICAN_ROUTE_ALIAS
  }

  const normalizedAfricanCode = normalizeCountryCode(AFRICAN_EDITION.code)
  if (normalized === normalizedAfricanCode) {
    return AFRICAN_ROUTE_ALIAS
  }

  return normalized
}

export const resolveEdition = (countryCode: string): SupportedEdition | null => {
  const normalized = normalizeCountryCode(countryCode)

  if (normalized === AFRICAN_ROUTE_ALIAS) {
    return AFRICAN_EDITION
  }

  return SUPPORTED_EDITION_LOOKUP.get(normalized) ?? null
}

export const sanitizeBaseUrl = (value: string): string => value.replace(/\/$/, "")

type PostBySlugQueryResult = {
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
}

export async function loadArticle(countryCode: string, slug: string): Promise<WordPressPost | null> {
  try {
    const cacheTags = buildCacheTags({
      country: countryCode,
      section: "article",
      extra: [`slug:${slug}`],
    })

    const gqlData = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      countryCode,
      POST_BY_SLUG_QUERY,
      { slug },
      { tags: cacheTags, revalidate: CACHE_DURATIONS.SHORT },
    )

    const node = gqlData?.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value))

    if (!node) {
      console.log(`[v0] No article found for ${slug} in ${countryCode}`)
      return null
    }

    return mapGraphqlPostToWordPressPost(node, countryCode)
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
