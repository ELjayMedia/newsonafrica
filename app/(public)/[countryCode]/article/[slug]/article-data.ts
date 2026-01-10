import { ENV } from "@/config/env"
import { cacheTags } from "@/lib/cache"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
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
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress-queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

const ARTICLE_CACHE_KEY_PREFIX = "article"
const ARTICLE_CACHE_KV_TTL_SECONDS = 15 * 60
const ARTICLE_CACHE_KV_STALE_THRESHOLD_MS = 90_000

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()

export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_WORDPRESS_COUNTRIES = new Set(Object.keys(COUNTRIES).map((code) => normalizeCountryCode(code)))

const hasWordPressEndpoint = (countryCode: string): boolean =>
  SUPPORTED_WORDPRESS_COUNTRIES.has(normalizeCountryCode(countryCode))

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))

type ArticleCountryPriorityCacheEntry = {
  priority: string[]
  signature: string
}

const articleCountryPriorityCache = new Map<string, ArticleCountryPriorityCacheEntry>()

const computeEditionConfigSignature = (): string => {
  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const editions = SUPPORTED_EDITIONS.map((edition) => ({
    code: normalizeCountryCode(edition.code),
    isCountryEdition: isCountryEdition(edition),
  }))

  return JSON.stringify({ defaultSite, editions })
}

export const resetArticleCountryPriorityCache = (): void => {
  if (process.env.NODE_ENV === "production") {
    return
  }

  articleCountryPriorityCache.clear()
}

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
  post?: PostFieldsFragment | null
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
}

type CachedArticlePayload = {
  article: WordPressPost
  sourceCountry: string
  canonicalCountry: string | null
  version: string | null
  tags: string[]
  cachedAt: number
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
  version: string | null
  canonicalCountry: string | null
}

export type LoadArticleResult =
  | ({ status: "found" } & LoadedArticle)
  | { status: "not_found" }
  | { status: "temporary_error"; error: unknown; failure?: WordPressGraphQLFailure }

const asLoadArticleResult = (
  countryCode: string,
  result: WordPressGraphQLResult<PostBySlugQueryResult>,
  slug: string,
  preview: boolean,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

  let node: PostFieldsFragment | null = null

  if (preview && result.post) {
    node = result.post
  }

  if (!node) {
    node = result.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value)) ?? null
  }

  if (!node) {
    return { status: "not_found" }
  }

  const article = mapGraphqlPostToWordPressPost(node, countryCode)
  const tags = buildArticleCacheTags(countryCode, slug, article)
  const version = resolveArticleVersion(article)
  const canonicalCountry = normalizeCountryCode(countryCode)

  return { status: "found", article, tags, version, canonicalCountry }
}

export async function loadArticle(countryCode: string, slug: string, preview = false): Promise<LoadArticleResult> {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const slugTag = cacheTags.postSlug(countryCode, slug)
  const requestTags = [slugTag]
  const fetchOptions = preview ? { revalidate: CACHE_DURATIONS.NONE } : { tags: requestTags }

  try {
    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      countryCode,
      POST_BY_SLUG_QUERY,
      { slug, asPreview: preview },
      fetchOptions,
    )

    return asLoadArticleResult(countryCode, gqlResult, slug, preview)
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

const DEFAULT_ARTICLE_CACHE_VERSION = "latest"

const sanitizeCacheKeySegment = (value: string): string => {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]+/gi, "-")
  return sanitized.length > 0 ? sanitized : DEFAULT_ARTICLE_CACHE_VERSION
}

const resolveCacheVersionSegment = (version: string | null | undefined): string =>
  version ? sanitizeCacheKeySegment(version) : DEFAULT_ARTICLE_CACHE_VERSION

const resolveArticleVersion = (article: WordPressPost): string | null => {
  const rawVersion =
    article?.modified?.toString() ??
    article?.date?.toString() ??
    (article?.globalRelayId ? String(article.globalRelayId) : null) ??
    (article?.databaseId != null ? `db-${article.databaseId}` : null)

  if (!rawVersion) {
    return null
  }

  return sanitizeCacheKeySegment(rawVersion.trim().toLowerCase())
}

const buildArticleCacheKey = (country: string, slug: string, version?: string | null): string => {
  const cacheVersion = resolveCacheVersionSegment(version)
  return `${ARTICLE_CACHE_KEY_PREFIX}:${normalizeCountryCode(country)}:${normalizeSlug(slug)}:${cacheVersion}`
}

const buildArticleCacheTags = (country: string, slug: string, article: WordPressPost): string[] => {
  const slugTag = cacheTags.postSlug(country, slug)
  const tags = [slugTag]

  if (article?.databaseId != null) {
    tags.push(cacheTags.post(country, article.databaseId))
  }

  return tags
}

const buildCachedArticlePayload = (
  country: string,
  slug: string,
  payload: Partial<CachedArticlePayload> & { article: WordPressPost },
  fallbackSourceCountry: string,
): CachedArticlePayload => {
  const normalizedSourceCountry = normalizeCountryCode(payload.sourceCountry ?? fallbackSourceCountry)
  const canonicalCountry =
    payload.canonicalCountry != null ? normalizeCountryCode(payload.canonicalCountry) : normalizedSourceCountry
  const version = payload.version ?? resolveArticleVersion(payload.article)
  const tags =
    payload.tags && payload.tags.length > 0 ? payload.tags : buildArticleCacheTags(country, slug, payload.article)

  return {
    article: payload.article,
    sourceCountry: normalizedSourceCountry,
    canonicalCountry,
    version,
    tags,
    cachedAt: payload.cachedAt ?? Date.now(),
  }
}

const persistArticleCache = (country: string, slug: string, payload: CachedArticlePayload): void => {
  const latestCacheKey = buildArticleCacheKey(country, slug)
  const versionKeySegment = resolveCacheVersionSegment(payload.version)
  const versionedCacheKey =
    versionKeySegment === DEFAULT_ARTICLE_CACHE_VERSION
      ? latestCacheKey
      : buildArticleCacheKey(country, slug, versionKeySegment)
  const cacheKeys = Array.from(new Set([latestCacheKey, versionedCacheKey]))

  void (async () => {
    for (const cacheKey of cacheKeys) {
      try {
        await kvCache.set(cacheKey, createKvCacheEntry(payload), ARTICLE_CACHE_KV_TTL_SECONDS)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[v0] Failed to persist article cache entry", { cacheKey, error })
        }
      }
    }
  })()
}

const readStaleArticleFromKV = async (
  countryPriority: string[],
  slug: string,
): Promise<CachedArticleResolution | null> => {
  for (const country of countryPriority) {
    const latestCacheKey = buildArticleCacheKey(country, slug)

    try {
      const kvEntry = await kvCache.get<CachedArticlePayload>(latestCacheKey)
      if (kvEntry?.value) {
        const normalizedPayload = buildCachedArticlePayload(
          country,
          slug,
          kvEntry.value,
          kvEntry.value.sourceCountry ?? country,
        )
        return { ...normalizedPayload, cacheCountry: country }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[v0] Failed to read stale article from KV", { country, slug, error })
      }
    }
  }

  return null
}

export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const normalizedPrimary = normalizeCountryCode(countryCode)
  const signature = computeEditionConfigSignature()

  const cached = articleCountryPriorityCache.get(normalizedPrimary)
  if (cached?.signature === signature) {
    return cached.priority
  }

  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const africanEdition = normalizeCountryCode(AFRICAN_EDITION.code)

  const supportedCountryEditions = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) =>
    normalizeCountryCode(edition.code),
  )

  const prioritized = [normalizedPrimary, defaultSite, ...supportedCountryEditions, africanEdition]

  const supportedPriority = prioritized.filter(hasWordPressEndpoint)

  const priority = unique(supportedPriority)
  articleCountryPriorityCache.set(normalizedPrimary, { priority, signature })

  return priority
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
  staleCanonicalCountry?: string | null
}

export type ArticleLoadResult =
  | ({ status: "found"; sourceCountry: string } & LoadedArticle)
  | ArticleFallbackNotFound
  | ArticleFallbackTemporaryError

export class ArticleTemporarilyUnavailableError extends AggregateError {
  public readonly failures: ArticleTemporaryFailure[]

  public readonly staleArticle: WordPressPost | null

  public readonly staleSourceCountry: string | null

  public readonly staleCanonicalCountry: string | null

  constructor(
    failures: ArticleTemporaryFailure[],
    message: string,
    options?: {
      staleArticle?: WordPressPost | null
      staleSourceCountry?: string | null
      staleCanonicalCountry?: string | null
    },
  ) {
    super(
      failures.map(({ error, failure }) => failure?.error ?? error),
      message,
    )
    this.name = "ArticleTemporarilyUnavailableError"
    this.failures = failures
    this.staleArticle = options?.staleArticle ?? null
    this.staleSourceCountry = options?.staleSourceCountry ?? null
    this.staleCanonicalCountry = options?.staleCanonicalCountry ?? null
  }
}

const buildTemporaryFailureMessage = (failures: ArticleTemporaryFailure[]): string =>
  `Temporary WordPress failure for countries: ${failures.map(({ country }) => country).join(", ")}`

export async function loadArticleWithFallback(
  slug: string,
  countryPriority: string[],
  preview = false,
): Promise<ArticleLoadResult> {
  const normalizedSlug = normalizeSlug(slug)

  const [primaryCountry, ...fallbackCountries] = countryPriority

  if (!primaryCountry) {
    return { status: "not_found" }
  }

  const temporaryFailures: ArticleTemporaryFailure[] = []

  const primaryArticle = await loadArticle(primaryCountry, normalizedSlug, preview)

  if (primaryArticle.status === "temporary_error") {
    temporaryFailures.push({
      country: primaryCountry,
      error: primaryArticle.error,
      failure: primaryArticle.failure,
    })
  } else if (primaryArticle.status === "found") {
    const cachedPayload = buildCachedArticlePayload(primaryCountry, normalizedSlug, primaryArticle, primaryCountry)
    if (!preview) {
      persistArticleCache(primaryCountry, normalizedSlug, cachedPayload)
    }
    return {
      status: "found",
      article: cachedPayload.article,
      tags: cachedPayload.tags,
      version: cachedPayload.version,
      canonicalCountry: cachedPayload.canonicalCountry,
      sourceCountry: cachedPayload.sourceCountry,
    }
  }

  for (const fallbackCountry of fallbackCountries) {
    const fallbackArticle = await loadArticle(fallbackCountry, normalizedSlug, preview)

    if (fallbackArticle.status === "temporary_error") {
      temporaryFailures.push({
        country: fallbackCountry,
        error: fallbackArticle.error,
        failure: fallbackArticle.failure,
      })
    } else if (fallbackArticle.status === "found") {
      const cachedPayload = buildCachedArticlePayload(fallbackCountry, normalizedSlug, fallbackArticle, fallbackCountry)
      if (!preview) {
        persistArticleCache(fallbackCountry, normalizedSlug, cachedPayload)
      }
      return {
        status: "found",
        article: cachedPayload.article,
        tags: cachedPayload.tags,
        version: cachedPayload.version,
        canonicalCountry: cachedPayload.canonicalCountry,
        sourceCountry: cachedPayload.sourceCountry,
      }
    }
  }

  if (temporaryFailures.length > 0 && !preview) {
    const stale = await readStaleArticleFromKV(countryPriority, normalizedSlug)
    if (stale?.article) {
      const stalePayload = buildCachedArticlePayload(
        stale.sourceCountry ?? stale.cacheCountry,
        normalizedSlug,
        stale,
        stale.sourceCountry ?? stale.cacheCountry,
      )
      const message = buildTemporaryFailureMessage(temporaryFailures)
      const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message, {
        staleArticle: stalePayload.article,
        staleSourceCountry: stalePayload.sourceCountry,
        staleCanonicalCountry: stalePayload.canonicalCountry,
      })
      return {
        status: "temporary_error",
        error,
        failures: temporaryFailures,
        staleArticle: stalePayload.article,
        staleSourceCountry: stalePayload.sourceCountry,
        staleCanonicalCountry: stalePayload.canonicalCountry,
      }
    }

    const message = buildTemporaryFailureMessage(temporaryFailures)
    const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message)
    return {
      status: "temporary_error",
      error,
      failures: temporaryFailures,
    }
  }

  return { status: "not_found" }
}

export { PLACEHOLDER_IMAGE_PATH }
