import { ENV } from "@/config/env"
import { cacheTags } from "@/lib/cache"
import { enhancedCache } from "@/lib/cache/enhanced-cache"
import {
  createCacheEntry as createKvCacheEntry,
  getEntryAge as getKvEntryAge,
  kvCache,
} from "@/lib/cache/kv"
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

export const ARTICLE_PAGE_REVALIDATE_SECONDS = 600

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

type CachedArticlePayload = {
  article: WordPressPost
  sourceCountry: string
}

type CachedArticleResolution = CachedArticlePayload & {
  cacheCountry: string
}

type CachedArticleReadResult = {
  payload: CachedArticlePayload
  isStale: boolean
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
  const tags = buildArticleCacheTags(countryCode, slug, article)

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
      { tags: requestTags, revalidate: ARTICLE_PAGE_REVALIDATE_SECONDS },
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

const buildArticleCacheKey = (country: string, slug: string): string =>
  `${ARTICLE_CACHE_KEY_PREFIX}:${normalizeCountryCode(country)}:${normalizeSlug(slug)}`

const buildArticleCacheTags = (country: string, slug: string, article: WordPressPost): string[] => {
  const slugTag = cacheTags.postSlug(country, slug)
  const tags = [slugTag]

  if (article?.databaseId != null) {
    tags.push(cacheTags.post(country, article.databaseId))
  }

  return tags
}

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

const readArticleCache = async (
  country: string,
  slug: string,
): Promise<CachedArticleReadResult | null> => {
  const cacheKey = buildArticleCacheKey(country, slug)

  const cached = enhancedCache.get<CachedArticlePayload>(cacheKey)
  if (cached.exists && cached.data) {
    return { payload: cached.data, isStale: cached.isStale }
  }

  try {
    const kvEntry = await kvCache.get<CachedArticlePayload>(cacheKey)
    if (kvEntry?.value) {
      const age = getKvEntryAge(kvEntry)
      const isStale = age > ARTICLE_CACHE_TTL_MS
      try {
        enhancedCache.set(cacheKey, kvEntry.value, ARTICLE_CACHE_TTL_MS, ARTICLE_CACHE_STALE_MS)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to hydrate in-memory article cache", { cacheKey, error })
        }
      }

      return { payload: kvEntry.value, isStale }
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
    if (cached?.payload) {
      return { ...cached.payload, cacheCountry: country }
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

  const primaryCached = await readArticleCache(primaryCountry, normalizedSlug)
  if (primaryCached?.payload && !primaryCached.isStale) {
    const { article, sourceCountry } = primaryCached.payload
    return {
      status: "found",
      article,
      tags: buildArticleCacheTags(primaryCountry, normalizedSlug, article),
      sourceCountry: sourceCountry ?? primaryCountry,
    }
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

  type FallbackState =
    | { kind: "success"; country: string; result: Extract<LoadArticleResult, { status: "found" }> }
    | { kind: "failure" }

  const fallbackStates: Array<FallbackState | undefined> = new Array(fallbackCountries.length)

  const fallbackEntries = fallbackCountries.map((country, index) => ({
    country,
    index,
    ready: loadArticle(country, normalizedSlug).then(
      (result):
        | { type: "fulfilled"; country: string; index: number; result: LoadArticleResult }
        | { type: "rejected"; country: string; index: number; error: unknown } =>
        ({ type: "fulfilled", country, index, result }),
      (error): { type: "rejected"; country: string; index: number; error: unknown } => ({
        type: "rejected",
        country,
        index,
        error,
      }),
    ),
  }))

  const pending = [...fallbackEntries]

  while (pending.length > 0) {
    const resolution = await Promise.race(pending.map((entry) => entry.ready))

    const pendingIndex = pending.findIndex((entry) => entry.index === resolution.index)
    if (pendingIndex !== -1) {
      pending.splice(pendingIndex, 1)
    }

    if (resolution.type === "rejected") {
      temporaryFailures.push({ country: resolution.country, error: resolution.error })
      fallbackStates[resolution.index] = { kind: "failure" }
    } else {
      const { result, country, index } = resolution

      if (result.status === "temporary_error") {
        temporaryFailures.push({ country, error: result.error, failure: result.failure })
        fallbackStates[index] = { kind: "failure" }
      } else if (result.status === "found") {
        fallbackStates[index] = { kind: "success", country, result }
      } else {
        fallbackStates[index] = { kind: "failure" }
      }
    }

    for (let i = 0; i < fallbackStates.length; i += 1) {
      const state = fallbackStates[i]
      if (!state) {
        break
      }

      if (state.kind === "success") {
        persistArticleCache(state.country, normalizedSlug, {
          article: state.result.article,
          sourceCountry: state.country,
        })
        return { ...state.result, sourceCountry: state.country }
      }
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
