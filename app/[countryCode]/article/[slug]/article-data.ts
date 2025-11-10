import { ENV } from "@/config/env"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import {
  COUNTRIES,
  fetchWordPressGraphQL,
  type WordPressGraphQLFailure,
  type WordPressGraphQLResult,
} from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress-queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()

export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_WORDPRESS_COUNTRIES = new Set(
  Object.keys(COUNTRIES).map((code) => normalizeCountryCode(code)),
)

const hasWordPressEndpoint = (countryCode: string): boolean =>
  SUPPORTED_WORDPRESS_COUNTRIES.has(normalizeCountryCode(countryCode))

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

export interface LoadedArticle {
  article: WordPressPost
  tags: string[]
}

export type LoadArticleResult =
  | ({ status: "found" } & LoadedArticle)
  | { status: "not_found" }
  | { status: "temporary_error"; error: unknown; failure?: WordPressGraphQLFailure }

const asLoadArticleResult = (
  countryCode: string,
  result: WordPressGraphQLResult<PostBySlugQueryResult>,
  slug: string,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

  const node = result.posts?.nodes?.find(
    (value): value is PostFieldsFragment => Boolean(value),
  )

  if (!node) {
    return { status: "not_found" }
  }

  const article = mapGraphqlPostToWordPressPost(node, countryCode)
  const slugTag = cacheTags.postSlug(countryCode, slug)
  const tags = [slugTag]

  if (node?.databaseId != null) {
    tags.push(cacheTags.post(countryCode, node.databaseId))
  }

  return { status: "found", article, tags }
}

export async function loadArticle(countryCode: string, slug: string): Promise<LoadArticleResult> {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const slugTag = cacheTags.postSlug(countryCode, slug)
  const requestTags = [slugTag]

  try {
    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      countryCode,
      POST_BY_SLUG_QUERY,
      { slug },
      { tags: requestTags, revalidate: CACHE_DURATIONS.SHORT },
    )

    return asLoadArticleResult(countryCode, gqlResult, slug)
  } catch (error) {
    return { status: "temporary_error", error }
  }
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
  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const africanEdition = normalizeCountryCode(AFRICAN_EDITION.code)

  const supportedCountryEditions = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) =>
    normalizeCountryCode(edition.code),
  )

  const prioritized = [normalizedPrimary, defaultSite, ...supportedCountryEditions, africanEdition]

  const supportedPriority = prioritized.filter(hasWordPressEndpoint)

  return unique(supportedPriority)
}

export type ArticleFallbackNotFound = { status: "not_found" }

type ArticleTemporaryFailure = {
  country: string
  error: unknown
  failure?: WordPressGraphQLFailure
}

export type ArticleFallbackTemporaryError = {
  status: "temporary_error"
  error: AggregateError
  failures: ArticleTemporaryFailure[]
}

export type ArticleLoadResult =
  | ({ status: "found"; sourceCountry: string } & LoadedArticle)
  | ArticleFallbackNotFound
  | ArticleFallbackTemporaryError

export async function loadArticleWithFallback(
  slug: string,
  countryPriority: string[],
): Promise<ArticleLoadResult> {
  const normalizedSlug = normalizeSlug(slug)

  const [primaryCountry, ...fallbackCountries] = countryPriority

  if (!primaryCountry) {
    return { status: "not_found" }
  }

  const temporaryFailures: ArticleTemporaryFailure[] = []

  const primaryArticle = await loadArticle(primaryCountry, normalizedSlug)

  if (primaryArticle.status === "temporary_error") {
    temporaryFailures.push({
      country: primaryCountry,
      error: primaryArticle.error,
      failure: primaryArticle.failure,
    })
  } else if (primaryArticle.status === "found") {
    return { ...primaryArticle, sourceCountry: primaryCountry }
  }

  if (fallbackCountries.length === 0) {
    if (temporaryFailures.length > 0) {
      return {
        status: "temporary_error",
        error: new AggregateError(
          temporaryFailures.map(({ error, failure }) => failure?.error ?? error),
          `Temporary WordPress failure for countries: ${temporaryFailures
            .map(({ country }) => country)
            .join(", ")}`,
        ),
        failures: temporaryFailures,
      }
    }

    return { status: "not_found" }
  }

  const fallbackEntries = fallbackCountries.map((country) => ({
    country,
    promise: loadArticle(country, normalizedSlug).then<
      | { status: "fulfilled"; result: LoadArticleResult }
      | { status: "rejected"; error: unknown }
    >(
      (result) => ({ status: "fulfilled", result }),
      (error) => ({ status: "rejected", error }),
    ),
  }))

  for (const { country, promise } of fallbackEntries) {
    const result = await promise

    if (result.status === "rejected") {
      temporaryFailures.push({ country, error: result.error })
      continue
    }

    if (result.result.status === "temporary_error") {
      temporaryFailures.push({
        country,
        error: result.result.error,
        failure: result.result.failure,
      })
      continue
    }

    if (result.result.status === "found") {
      return { ...result.result, sourceCountry: country }
    }
  }

  if (temporaryFailures.length > 0) {
    return {
      status: "temporary_error",
      error: new AggregateError(
        temporaryFailures.map(({ error, failure }) => failure?.error ?? error),
        `Temporary WordPress failure for countries: ${temporaryFailures
          .map(({ country }) => country)
          .join(", ")}`,
      ),
      failures: temporaryFailures,
    }
  }

  return { status: "not_found" }
}

export { PLACEHOLDER_IMAGE_PATH }
