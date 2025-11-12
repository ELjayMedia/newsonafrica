import { ENV } from "@/config/env"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache"
import { enhancedCache } from "@/lib/cache/enhanced-cache"
import { createCacheEntry as createKvCacheEntry, kvCache } from "@/lib/cache/kv"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import {
  COUNTRIES,
  fetchWordPressGraphQL,
  type WordPressGraphQLFailure,
  type WordPressGraphQLResult,
} from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import { POST_BY_SLUG_QUERY, POST_PREVIEW_BY_SLUG_QUERY } from "@/lib/wordpress-queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

const ARTICLE_CACHE_KEY_PREFIX = "article"
const ARTICLE_CACHE_TTL_MS = 90_000
const ARTICLE_CACHE_STALE_MS = 10 * 60 * 1000
const ARTICLE_CACHE_KV_TTL_SECONDS = 15 * 60

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

type PostPreviewQueryResult = {
  post?: PostFieldsFragment | null
}

type CachedArticlePayload = {
  article: WordPressPost
  sourceCountry: string
}

type CachedArticleResolution = CachedArticlePayload & {
  cacheCountry: string
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

const asPreviewLoadArticleResult = (
  countryCode: string,
  result: WordPressGraphQLResult<PostPreviewQueryResult>,
  slug: string,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

  const node = result.post ?? null

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

export async function loadArticle(
  countryCode: string,
  slug: string,
  options: { preview?: boolean } = {},
): Promise<LoadArticleResult> {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const normalizedSlug = normalizeSlug(slug)
  const slugTag = cacheTags.postSlug(countryCode, normalizedSlug)
  const requestTags = [slugTag]

  try {
    if (options.preview) {
      const gqlResult = await fetchWordPressGraphQL<PostPreviewQueryResult>(
        countryCode,
        POST_PREVIEW_BY_SLUG_QUERY,
        { slug: normalizedSlug },
        { tags: requestTags, revalidate: CACHE_DURATIONS.NONE },
      )

      return asPreviewLoadArticleResult(countryCode, gqlResult, normalizedSlug)
    }

    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      countryCode,
      POST_BY_SLUG_QUERY,
      { slug: normalizedSlug },
      { tags: requestTags, revalidate: CACHE_DURATIONS.NONE },
    )

    return asLoadArticleResult(countryCode, gqlResult, normalizedSlug)
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

const buildArticleCacheKey = (country: string, slug: string): string =>
  `${ARTICLE_CACHE_KEY_PREFIX}:${normalizeCountryCode(country)}:${normalizeSlug(slug)}`

const persistArticleCache = (country: string, slug: string, payload: CachedArticlePayload): void => {
  const cacheKey = buildArticleCacheKey(country, slug)

  try {
    enhancedCache.set(cacheKey, payload, ARTICLE_CACHE_TTL_MS, ARTICLE_CACHE_STALE_MS)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to seed in-memory article cache", { cacheKey, error })
    }
  }

  void (async () => {
    try {
      await kvCache.set(cacheKey, createKvCacheEntry(payload), ARTICLE_CACHE_KV_TTL_SECONDS)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to persist article cache entry", { cacheKey, error })
      }
    }
  })()
}

const readArticleCache = async (country: string, slug: string): Promise<CachedArticlePayload | null> => {
  const cacheKey = buildArticleCacheKey(country, slug)

  const cached = enhancedCache.get<CachedArticlePayload>(cacheKey)
  if (cached.exists && cached.data) {
    return cached.data
  }

  try {
    const kvEntry = await kvCache.get<CachedArticlePayload>(cacheKey)
    if (kvEntry?.value) {
      try {
        enhancedCache.set(cacheKey, kvEntry.value, ARTICLE_CACHE_TTL_MS, ARTICLE_CACHE_STALE_MS)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to hydrate in-memory article cache", { cacheKey, error })
        }
      }

      return kvEntry.value
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to read article cache entry", { cacheKey, error })
    }
  }

  return null
}

const readStaleArticleFromCache = async (
  countryPriority: string[],
  slug: string,
): Promise<CachedArticleResolution | null> => {
  for (const country of countryPriority) {
    const cached = await readArticleCache(country, slug)
    if (cached) {
      return { ...cached, cacheCountry: country }
    }
  }

  return null
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
  error: ArticleTemporarilyUnavailableError
  failures: ArticleTemporaryFailure[]
  staleArticle?: WordPressPost | null
  staleSourceCountry?: string | null
}

export type ArticleLoadResult =
  | ({ status: "found"; sourceCountry: string } & LoadedArticle)
  | ArticleFallbackNotFound
  | ArticleFallbackTemporaryError

export class ArticleTemporarilyUnavailableError extends AggregateError {
  public readonly failures: ArticleTemporaryFailure[]

  public readonly staleArticle: WordPressPost | null

  public readonly staleSourceCountry: string | null

  constructor(
    failures: ArticleTemporaryFailure[],
    message: string,
    options?: { staleArticle?: WordPressPost | null; staleSourceCountry?: string | null },
  ) {
    super(
      failures.map(({ error, failure }) => failure?.error ?? error),
      message,
    )
    this.name = "ArticleTemporarilyUnavailableError"
    this.failures = failures
    this.staleArticle = options?.staleArticle ?? null
    this.staleSourceCountry = options?.staleSourceCountry ?? null
  }
}

const buildTemporaryFailureMessage = (failures: ArticleTemporaryFailure[]): string =>
  `Temporary WordPress failure for countries: ${failures.map(({ country }) => country).join(", ")}`

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
    persistArticleCache(primaryCountry, normalizedSlug, {
      article: primaryArticle.article,
      sourceCountry: primaryCountry,
    })
    return { ...primaryArticle, sourceCountry: primaryCountry }
  }

  if (fallbackCountries.length === 0) {
    if (temporaryFailures.length > 0) {
      const stale = await readStaleArticleFromCache(countryPriority, normalizedSlug)
      const message = buildTemporaryFailureMessage(temporaryFailures)
      const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message, {
        staleArticle: stale?.article,
        staleSourceCountry: stale?.sourceCountry ?? stale?.cacheCountry ?? null,
      })
      return {
        status: "temporary_error",
        error,
        failures: temporaryFailures,
        staleArticle: stale?.article,
        staleSourceCountry: stale?.sourceCountry ?? stale?.cacheCountry ?? null,
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
      persistArticleCache(country, normalizedSlug, {
        article: result.result.article,
        sourceCountry: country,
      })
      return { ...result.result, sourceCountry: country }
    }
  }

  if (temporaryFailures.length > 0) {
    const stale = await readStaleArticleFromCache(countryPriority, normalizedSlug)
    const message = buildTemporaryFailureMessage(temporaryFailures)
    const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message, {
      staleArticle: stale?.article,
      staleSourceCountry: stale?.sourceCountry ?? stale?.cacheCountry ?? null,
    })
    return {
      status: "temporary_error",
      error,
      failures: temporaryFailures,
      staleArticle: stale?.article,
      staleSourceCountry: stale?.sourceCountry ?? stale?.cacheCountry ?? null,
    }
  }

  return { status: "not_found" }
}

export { PLACEHOLDER_IMAGE_PATH }
