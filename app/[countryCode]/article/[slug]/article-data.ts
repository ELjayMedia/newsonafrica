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

export const ARTICLE_PAGE_REVALIDATE_SECONDS = 0

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

const SUPPORTED_EDITION_LOOKUP = new Map(
  SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]),
)

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
    node =
      result.posts?.nodes?.find(
        (value): value is PostFieldsFragment => Boolean(value),
      ) ?? null
  }

  if (!node && !preview && result.post) {
    node = result.post
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

export async function loadArticle(
  countryCode: string,
  slug: string,
  preview = false,
): Promise<LoadArticleResult> {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const slugTag = cacheTags.postSlug(countryCode, slug)
  const requestTags = [slugTag]
  const revalidateSeconds = preview ? 0 : ARTICLE_PAGE_REVALIDATE_SECONDS

  try {
    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      countryCode,
      POST_BY_SLUG_QUERY,
      { slug, asPreview: preview },
      preview
        ? { revalidate: revalidateSeconds }
        : { tags: requestTags, revalidate: revalidateSeconds },
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

const buildArticleCacheKey = (
  country: string,
  slug: string,
  version?: string | null,
): string => {
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
    payload.canonicalCountry != null
      ? normalizeCountryCode(payload.canonicalCountry)
      : normalizedSourceCountry
  const version = payload.version ?? resolveArticleVersion(payload.article)
  const tags =
    payload.tags && payload.tags.length > 0
      ? payload.tags
      : buildArticleCacheTags(country, slug, payload.article)

  return {
    article: payload.article,
    sourceCountry: normalizedSourceCountry,
    canonicalCountry,
    version,
    tags,
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

  for (const cacheKey of cacheKeys) {
    try {
      enhancedCache.set(cacheKey, payload, ARTICLE_CACHE_TTL_MS, ARTICLE_CACHE_STALE_MS)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to seed in-memory article cache", { cacheKey, error })
      }
    }
  }

  void (async () => {
    for (const cacheKey of cacheKeys) {
      try {
        await kvCache.set(cacheKey, createKvCacheEntry(payload), ARTICLE_CACHE_KV_TTL_SECONDS)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to persist article cache entry", { cacheKey, error })
        }
      }
    }
  })()
}

const readArticleCache = async (
  country: string,
  slug: string,
): Promise<CachedArticleReadResult | null> => {
  const latestCacheKey = buildArticleCacheKey(country, slug)

  const cached = enhancedCache.get<CachedArticlePayload>(latestCacheKey)
  if (cached.exists && cached.data) {
    const normalizedPayload = buildCachedArticlePayload(
      country,
      slug,
      cached.data,
      cached.data.sourceCountry ?? country,
    )
    return { payload: normalizedPayload, isStale: cached.isStale }
  }

  try {
    const kvEntry = await kvCache.get<CachedArticlePayload>(latestCacheKey)
    if (kvEntry?.value) {
      const age = getKvEntryAge(kvEntry)
      const isStale = age > ARTICLE_CACHE_TTL_MS
      const normalizedPayload = buildCachedArticlePayload(
        country,
        slug,
        kvEntry.value,
        kvEntry.value.sourceCountry ?? country,
      )
      const versionKeySegment = resolveCacheVersionSegment(normalizedPayload.version)
      const versionedCacheKey =
        versionKeySegment === DEFAULT_ARTICLE_CACHE_VERSION
          ? latestCacheKey
          : buildArticleCacheKey(country, slug, versionKeySegment)
      const cacheKeys = Array.from(new Set([latestCacheKey, versionedCacheKey]))
      try {
        for (const cacheKey of cacheKeys) {
          enhancedCache.set(cacheKey, normalizedPayload, ARTICLE_CACHE_TTL_MS, ARTICLE_CACHE_STALE_MS)
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to hydrate in-memory article cache", { cacheKeys, error })
        }
      }

      return { payload: normalizedPayload, isStale }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to read article cache entry", { cacheKey: latestCacheKey, error })
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

  const shouldUseCache = !preview

  const primaryCached = shouldUseCache
    ? await readArticleCache(primaryCountry, normalizedSlug)
    : null
  if (shouldUseCache && primaryCached?.payload && !primaryCached.isStale) {
    const cachedPayload = buildCachedArticlePayload(
      primaryCountry,
      normalizedSlug,
      primaryCached.payload,
      primaryCountry,
    )
    return {
      status: "found",
      article: cachedPayload.article,
      tags: cachedPayload.tags,
      version: cachedPayload.version,
      canonicalCountry: cachedPayload.canonicalCountry,
      sourceCountry: cachedPayload.sourceCountry ?? primaryCountry,
    }
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
    const cachedPayload = buildCachedArticlePayload(
      primaryCountry,
      normalizedSlug,
      primaryArticle,
      primaryCountry,
    )
    if (shouldUseCache) {
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

  if (fallbackCountries.length === 0) {
    if (temporaryFailures.length > 0) {
      const stale = shouldUseCache
        ? await readStaleArticleFromCache(countryPriority, normalizedSlug)
        : null
      const stalePayload =
        shouldUseCache && stale?.article
          ? buildCachedArticlePayload(
              stale.sourceCountry ?? stale.cacheCountry,
              normalizedSlug,
              stale,
              stale.sourceCountry ?? stale.cacheCountry,
            )
          : null
        const message = buildTemporaryFailureMessage(temporaryFailures)
        const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message, {
          staleArticle: stalePayload?.article ?? stale?.article ?? null,
          staleSourceCountry: stalePayload?.sourceCountry ?? stale?.sourceCountry ?? stale?.cacheCountry ?? null,
          staleCanonicalCountry: stalePayload?.canonicalCountry ?? null,
        })
        return {
          status: "temporary_error",
          error,
          failures: temporaryFailures,
          staleArticle: stalePayload?.article ?? stale?.article ?? null,
          staleSourceCountry: stalePayload?.sourceCountry ?? stale?.sourceCountry ?? stale?.cacheCountry ?? null,
          staleCanonicalCountry: stalePayload?.canonicalCountry ?? null,
        }
    }

    return { status: "not_found" }
  }

  const fallbackLoadCandidates: Array<{ country: string; index: number }> = []

  for (const [index, country] of fallbackCountries.entries()) {
    if (shouldUseCache) {
      const cached = await readArticleCache(country, normalizedSlug)
      if (cached?.payload && !cached.isStale) {
        const cachedPayload = buildCachedArticlePayload(
          country,
          normalizedSlug,
          cached.payload,
          cached.payload.sourceCountry ?? country,
        )
        return {
          status: "found",
          article: cachedPayload.article,
          tags: cachedPayload.tags,
          version: cachedPayload.version,
          canonicalCountry: cachedPayload.canonicalCountry,
          sourceCountry: cachedPayload.sourceCountry ?? country,
        }
      }
    }

    fallbackLoadCandidates.push({ country, index })
  }

  const fallbackEntries = fallbackLoadCandidates.map(({ country, index }) => ({
    country,
    index,
    ready: loadArticle(country, normalizedSlug, preview).then(
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

  const resolutions = fallbackEntries.map((entry) => entry.ready)
  const remainingPositions = new Set(resolutions.map((_, position) => position))

  while (remainingPositions.size > 0) {
    const resolution = await Promise.race(
      Array.from(remainingPositions, (position) =>
        resolutions[position]!.then((value) => ({ ...value, position })),
      ),
    )

    remainingPositions.delete(resolution.position)

    if (resolution.type === "rejected") {
      temporaryFailures.push({ country: resolution.country, error: resolution.error })
      continue
    }

    const { result, country } = resolution

    if (result.status === "temporary_error") {
      temporaryFailures.push({ country, error: result.error, failure: result.failure })
      continue
    }

    if (result.status === "found") {
      const cachedPayload = buildCachedArticlePayload(
        country,
        normalizedSlug,
        result,
        country,
      )
      if (shouldUseCache) {
        persistArticleCache(country, normalizedSlug, cachedPayload)
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

  if (temporaryFailures.length > 0) {
    const stale = shouldUseCache
      ? await readStaleArticleFromCache(countryPriority, normalizedSlug)
      : null
    const stalePayload =
      shouldUseCache && stale?.article
        ? buildCachedArticlePayload(
            stale.sourceCountry ?? stale.cacheCountry,
            normalizedSlug,
            stale,
            stale.sourceCountry ?? stale.cacheCountry,
          )
        : null
    const message = buildTemporaryFailureMessage(temporaryFailures)
    const error = new ArticleTemporarilyUnavailableError(temporaryFailures, message, {
      staleArticle: stalePayload?.article ?? stale?.article ?? null,
      staleSourceCountry: stalePayload?.sourceCountry ?? stale?.sourceCountry ?? stale?.cacheCountry ?? null,
      staleCanonicalCountry: stalePayload?.canonicalCountry ?? null,
    })
    return {
      status: "temporary_error",
      error,
      failures: temporaryFailures,
      staleArticle: stalePayload?.article ?? stale?.article ?? null,
      staleSourceCountry: stalePayload?.sourceCountry ?? stale?.sourceCountry ?? stale?.cacheCountry ?? null,
      staleCanonicalCountry: stalePayload?.canonicalCountry ?? null,
    }
  }

  return { status: "not_found" }
}

export { PLACEHOLDER_IMAGE_PATH }
