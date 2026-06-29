import { ENV } from "@/config/env"
import { cacheTags } from "@/lib/cache"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { buildArticlePath, normalizeArticleCountrySegment } from "@/lib/routing/article-route"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { fetchWordPressGraphQL, type WordPressGraphQLFailure, type WordPressGraphQLResult } from "@/lib/wordpress/client"
import { COUNTRIES } from "@/lib/wordpress/service"
import type { WordPressPost } from "@/types/wp"
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress/queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"

export const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

const ARTICLE_CACHE_KEY_PREFIX = "article"

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

  return JSON.stringify({
    defaultSite,
    editions,
    crossCountryFallback: process.env.FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK ?? "",
    crossPostPolicy: process.env.ARTICLE_CROSS_POST_POLICY ?? "",
    endpoints: SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) => [
      normalizeCountryCode(edition.code),
      process.env[`NEXT_PUBLIC_WP_${edition.code.toUpperCase()}_GRAPHQL`] ?? null,
    ]),
  })
}

export const resetArticleCountryPriorityCache = (): void => {
  if (process.env.NODE_ENV === "production") {
    return
  }

  articleCountryPriorityCache.clear()
}

export const AFRICAN_ROUTE_ALIAS = normalizeArticleCountrySegment(AFRICAN_EDITION.code)

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

export type ParsedArticleSlug = {
  normalizedSlug: string
  stableId: number | null
}

export const parseArticleSlugParam = (value: string): ParsedArticleSlug => {
  const normalizedSlug = normalizeSlug(value)
  const parts = normalizedSlug.split("-")
  const candidate = parts.at(-1)
  const stableId = candidate && /^\d+$/.test(candidate) ? Number.parseInt(candidate, 10) : null

  return {
    normalizedSlug,
    stableId: stableId != null && Number.isFinite(stableId) ? stableId : null,
  }
}

export const buildCanonicalArticleSlug = (slug: string, databaseId?: number | null): string => {
  const canonicalPath = buildArticlePath({
    countryCode: AFRICAN_ROUTE_ALIAS,
    slug,
    databaseId,
  })

  return canonicalPath.split("/").at(-1) ?? normalizeSlug(slug)
}

type PostBySlugQueryResult = {
  post?: PostFieldsFragment | null
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
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
  _preview: boolean,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

  const node =
    result.data.post ??
    result.data.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value)) ??
    null

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
  const fetchOptions = preview
    ? {
        revalidate: CACHE_DURATIONS.NONE,
        operationName: "PostBySlug" as const,
        routeContext: { route: "/[countryCode]/article/[slug]", surface: "article_detail" },
      }
    : {
        tags: requestTags,
        operationName: "PostBySlug" as const,
        routeContext: { route: "/[countryCode]/article/[slug]", surface: "article_detail" },
      }

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

const buildArticleCacheTags = (country: string, slug: string, article: WordPressPost): string[] => {
  const slugTag = cacheTags.postSlug(country, slug)
  const tags = [slugTag]

  if (article?.databaseId != null) {
    tags.push(cacheTags.post(country, article.databaseId))
  }

  return tags
}

const hasExplicitGraphQLEndpoint = (countryCode: string): boolean => {
  const key = `NEXT_PUBLIC_WP_${normalizeCountryCode(countryCode).toUpperCase()}_GRAPHQL`
  const value = process.env[key]

  if (typeof value === "string") {
    return value.trim().length > 0
  }

  return hasWordPressEndpoint(countryCode)
}

export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const normalizedPrimary = normalizeRouteCountry(countryCode)
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
  const crossCountryFallbackEnabled = process.env.FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK === "true"
  const allowAllSupported = process.env.ARTICLE_CROSS_POST_POLICY === "all_supported"

  const prioritized =
    crossCountryFallbackEnabled || allowAllSupported
      ? [normalizedPrimary, defaultSite, ...supportedCountryEditions, africanEdition]
      : [normalizedPrimary, defaultSite]

  const supportedPriority = prioritized.filter((code) => code !== africanEdition && hasExplicitGraphQLEndpoint(code))
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

  constructor(failures: ArticleTemporaryFailure[], message: string) {
    super(
      failures.map(({ error, failure }) => failure?.error ?? error),
      message,
    )
    this.name = "ArticleTemporarilyUnavailableError"
    this.failures = failures
  }
}

const buildTemporaryFailureMessage = (failures: ArticleTemporaryFailure[]): string =>
  `Temporary WordPress failure for countries: ${failures.map(({ country }) => country).join(", ")}`

export async function loadArticleWithFallback(
  slug: string,
  countryPriority: string[],
  preview = false,
  context?: { requestedCountry?: string; staleCacheServed?: boolean },
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
    return {
      status: "found",
      article: primaryArticle.article,
      tags: primaryArticle.tags,
      version: primaryArticle.version,
      canonicalCountry: primaryArticle.canonicalCountry,
      sourceCountry: primaryCountry,
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
      return {
        status: "found",
        article: fallbackArticle.article,
        tags: fallbackArticle.tags,
        version: fallbackArticle.version,
        canonicalCountry: fallbackArticle.canonicalCountry,
        sourceCountry: fallbackCountry,
      }
    }
  }

  if (temporaryFailures.length > 0 && !preview) {
    const attempts = countryPriority.map((country) => {
      const failure = temporaryFailures.find((entry) => entry.country === country)
      return failure
        ? {
            country,
            result: "temporary_error",
            failureKind: failure.failure?.kind ?? null,
            failureStatus: "status" in (failure.failure ?? {}) ? (failure.failure as { status?: number }).status ?? null : null,
          }
        : {
            country,
            result: "not_found",
            failureKind: null,
            failureStatus: null,
          }
    })

    console.error("[article-data] fallback attempts exhausted with temporary failures", {
      slug: normalizedSlug,
      requestedCountry: context?.requestedCountry ?? primaryCountry,
      countryPriority,
      staleCacheServed: context?.staleCacheServed ?? false,
      attempts,
    })

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
