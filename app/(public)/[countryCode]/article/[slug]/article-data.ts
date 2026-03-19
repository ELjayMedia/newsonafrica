import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache/cacheTags"
import { ENV } from "@/config/env"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers.server"
import { buildArticlePath, normalizeArticleCountrySegment } from "@/lib/routing/article-route"
import { fetchWordPressGraphQL, type WordPressGraphQLFailure, type WordPressGraphQLResult } from "@/lib/wordpress/client"
import { POST_BY_DATABASE_ID_QUERY, POST_BY_SLUG_QUERY } from "@/lib/wordpress/queries"
import type { WordPressPost } from "@/types/wp"
import type { PostFieldsFragment } from "@/types/wpgraphql"

export const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()
export const normalizeSlug = (value: string): string => value.toLowerCase().trim()

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))
const SUPPORTED_COUNTRY_CODES = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) => normalizeCountryCode(edition.code))
const articleCountryPriorityCache = new Map<string, string[]>()

export const AFRICAN_ROUTE_ALIAS = normalizeArticleCountrySegment(AFRICAN_EDITION.code)
export const normalizeRouteCountry = (country: string): string => normalizeArticleCountrySegment(country)

export const resolveEdition = (countryCode: string): SupportedEdition | null => {
  const normalized = normalizeCountryCode(countryCode)
  if (normalized === AFRICAN_ROUTE_ALIAS) return AFRICAN_EDITION
  return SUPPORTED_EDITION_LOOKUP.get(normalized) ?? null
}

export const sanitizeBaseUrl = (value: string): string => value.replace(/\/$/, "")

export type ParsedArticleSlug = {
  normalizedSlug: string
  stableId: number | null
}

type PostBySlugQueryResult = {
  post?: PostFieldsFragment | null
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
}

type PostByDatabaseIdQueryResult = {
  post?: PostFieldsFragment | null
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

export type LoadArticleWithFallbackResult =
  | ({ status: "found" } & LoadedArticle & { sourceCountry: string })
  | {
      status: "temporary_error"
      error: ArticleTemporarilyUnavailableError
      failures: { country: string; error: unknown; failure?: WordPressGraphQLFailure }[]
    }
  | { status: "not_found" }

export class ArticleTemporarilyUnavailableError extends Error {
  errors: unknown[]

  constructor(message: string, errors: unknown[]) {
    super(message)
    this.name = "ArticleTemporarilyUnavailableError"
    this.errors = errors
  }
}

const resolveWpEndpoint = (countryCode: string): string | undefined => {
  const envKey = `NEXT_PUBLIC_WP_${normalizeCountryCode(countryCode).toUpperCase()}_GRAPHQL`
  const value = process.env[envKey]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const hasWordPressEndpoint = (countryCode: string): boolean => Boolean(resolveWpEndpoint(countryCode))

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
  const normalizedCountry = normalizeCountryCode(country)
  const tags = [cacheTags.postSlug(normalizedCountry, slug)]

  if (article?.databaseId != null) {
    tags.push(cacheTags.post(normalizedCountry, article.databaseId))
  }

  return tags
}

const pickPostNode = <T extends PostBySlugQueryResult | PostByDatabaseIdQueryResult>(
  result: WordPressGraphQLResult<T>,
  preview: boolean,
): PostFieldsFragment | null => {
  const data = "data" in result ? result.data : undefined
  const directPost = result.ok ? (("post" in result ? result.post : undefined) ?? data?.post ?? null) : null

  if (directPost) {
    return directPost
  }

  if (preview) {
    return data?.post ?? null
  }

  if (data && "posts" in data) {
    return data.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value)) ?? null
  }

  return null
}

const asLoadArticleResult = (
  countryCode: string,
  result: WordPressGraphQLResult<PostBySlugQueryResult>,
  slug: string,
  preview: boolean,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

  const node = pickPostNode(result, preview)

  if (!node) {
    return { status: "not_found" }
  }

  const article = mapGraphqlPostToWordPressPost(node, countryCode)
  const tags = buildArticleCacheTags(countryCode, slug, article)
  const version = resolveArticleVersion(article)
  const canonicalCountry = normalizeCountryCode(countryCode)

  return { status: "found", article, tags, version, canonicalCountry }
}

const loadArticleBySlug = async (countryCode: string, slug: string, preview = false): Promise<LoadArticleResult> => {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const normalizedCountry = normalizeCountryCode(countryCode)
  const normalizedSlug = normalizeSlug(slug)
  const fetchOptions = preview
    ? { revalidate: CACHE_DURATIONS.NONE }
    : { tags: [cacheTags.postSlug(normalizedCountry, normalizedSlug)] }

  try {
    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      normalizedCountry,
      POST_BY_SLUG_QUERY,
      { slug: normalizedSlug, asPreview: preview },
      fetchOptions,
    )

    return asLoadArticleResult(normalizedCountry, gqlResult, normalizedSlug, preview)
  } catch (error) {
    return { status: "temporary_error", error }
  }
}

const loadArticleByDatabaseId = async (
  countryCode: string,
  databaseId: number,
  preview = false,
): Promise<LoadArticleResult> => {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const normalizedCountry = normalizeCountryCode(countryCode)
  const fetchOptions = preview
    ? { revalidate: CACHE_DURATIONS.NONE }
    : { tags: [cacheTags.post(normalizedCountry, databaseId)] }

  try {
    const gqlResult = await fetchWordPressGraphQL<PostByDatabaseIdQueryResult>(
      normalizedCountry,
      POST_BY_DATABASE_ID_QUERY,
      { id: databaseId, asPreview: preview },
      fetchOptions,
    )

    if (!gqlResult.ok) {
      return { status: "temporary_error", error: gqlResult.error, failure: gqlResult }
    }

    const node = pickPostNode(gqlResult, preview)

    if (!node) {
      return { status: "not_found" }
    }

    const article = mapGraphqlPostToWordPressPost(node, normalizedCountry)
    const resolvedSlug = normalizeSlug(article.slug ?? "") || String(databaseId)
    const tags = buildArticleCacheTags(normalizedCountry, resolvedSlug, article)
    const version = resolveArticleVersion(article)

    return {
      status: "found",
      article,
      tags,
      version,
      canonicalCountry: normalizedCountry,
    }
  } catch (error) {
    return { status: "temporary_error", error }
  }
}

export async function loadArticle(
  countryCode: string,
  slug: string,
  preview = false,
  stableId?: number | null,
): Promise<LoadArticleResult> {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const normalizedSlug = normalizeSlug(slug)

  if (typeof stableId === "number" && Number.isFinite(stableId)) {
    const byId = await loadArticleByDatabaseId(normalizedCountry, stableId, preview)
    if (byId.status === "found" || byId.status === "temporary_error") {
      return byId
    }
  }

  return loadArticleBySlug(normalizedCountry, normalizedSlug, preview)
}

export async function loadArticleWithFallback(
  slug: string,
  countryPriority: string[],
  preview = false,
  context?: { requestedCountry?: string; staleCacheServed?: boolean },
): Promise<LoadArticleWithFallbackResult> {
  const normalizedSlug = normalizeSlug(slug)
  const { stableId } = parseArticleSlugParam(normalizedSlug)
  const normalizedPriority = unique(countryPriority.filter(Boolean))
  const failures: { country: string; error: unknown; failure?: WordPressGraphQLFailure }[] = []

  for (const country of normalizedPriority) {
    const result = await loadArticle(country, normalizedSlug, preview, stableId)

    if (result.status === "found") {
      return {
        status: "found",
        article: result.article,
        tags: result.tags,
        version: result.version,
        canonicalCountry: result.canonicalCountry,
        sourceCountry: normalizeCountryCode(country),
      }
    }

    if (result.status === "temporary_error") {
      failures.push({ country: normalizeCountryCode(country), error: result.error, failure: result.failure })
    }
  }

  if (failures.length > 0) {
    console.error("[article-data] fallback attempts exhausted with temporary failures", {
      slug: normalizedSlug,
      requestedCountry: context?.requestedCountry,
      countryPriority: normalizedPriority,
      staleCacheServed: context?.staleCacheServed ?? false,
      attempts: normalizedPriority.map((country) => {
        const failure = failures.find((entry) => entry.country === normalizeCountryCode(country))
        return {
          country: normalizeCountryCode(country),
          result: failure ? "temporary_error" : "not_found",
          failureKind: failure?.failure?.kind ?? null,
          failureStatus:
            failure?.failure && "status" in failure.failure && typeof failure.failure.status === "number"
              ? failure.failure.status
              : null,
        }
      }),
    })

    return {
      status: "temporary_error",
      error: new ArticleTemporarilyUnavailableError(
        "Article is temporarily unavailable.",
        failures.map((failure) => failure.error),
      ),
      failures,
    }
  }

  return { status: "not_found" }
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

export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const cacheKey = normalizeCountryCode(countryCode)
  const cached = articleCountryPriorityCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const normalizedPrimary = cacheKey === AFRICAN_ROUTE_ALIAS ? normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE) : cacheKey
  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const includeAllSupported =
    process.env.FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK === "true" ||
    process.env.ARTICLE_CROSS_POST_POLICY === "all_supported"

  const prioritized = includeAllSupported
    ? [normalizedPrimary, defaultSite, ...SUPPORTED_COUNTRY_CODES]
    : [normalizedPrimary, defaultSite]

  const filtered = unique(prioritized).filter((country) => hasWordPressEndpoint(country))
  const resolved = filtered.length > 0 ? filtered : unique([normalizedPrimary])

  articleCountryPriorityCache.set(cacheKey, resolved)
  return resolved
}

export const resetArticleCountryPriorityCache = (): void => {
  articleCountryPriorityCache.clear()
}
