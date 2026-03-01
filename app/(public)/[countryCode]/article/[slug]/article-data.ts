import { ENV } from "@/config/env"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { buildArticlePath, normalizeArticleCountrySegment } from "@/lib/routing/article-route"

export const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()
export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))

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

<<<<<<< HEAD
type PostBySlugQueryResult = {
  post?: PostFieldsFragment | null
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
}

type PostByDatabaseIdQueryResult = {
  post?: PostFieldsFragment | null
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
  _preview: boolean,
): LoadArticleResult => {
  if (!result.ok) {
    return { status: "temporary_error", error: result.error, failure: result }
  }

<<<<<<< HEAD
  let node: PostFieldsFragment | null = null

  if (preview && result.data.post) {
    node = result.data.post
  }

  if (!node) {
    node = result.data.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value)) ?? null
  }
=======
  const node =
    result.post ?? result.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value)) ?? null
>>>>>>> 55292a8c (Prefer post field in article load result resolution)

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

const loadArticleByDatabaseId = async (countryCode: string, databaseId: number, preview = false): Promise<LoadArticleResult> => {
  if (!hasWordPressEndpoint(countryCode)) {
    return { status: "not_found" }
  }

  const requestTags = [cacheTags.post(countryCode, databaseId)]
  const fetchOptions = preview ? { revalidate: CACHE_DURATIONS.NONE } : { tags: requestTags }

  try {
    const gqlResult = await fetchWordPressGraphQL<PostByDatabaseIdQueryResult>(
      countryCode,
      POST_BY_DATABASE_ID_QUERY,
      { id: databaseId, asPreview: preview },
      fetchOptions,
    )

    const node = gqlResult.ok ? gqlResult.post ?? null : null

    if (!gqlResult.ok) {
      return { status: "temporary_error", error: gqlResult.error, failure: gqlResult }
    }

    if (!node) {
      return { status: "not_found" }
    }

    const article = mapGraphqlPostToWordPressPost(node, countryCode)
    const resolvedSlug = normalizeSlug(article.slug ?? "") || String(databaseId)
    const tags = buildArticleCacheTags(countryCode, resolvedSlug, article)
    const version = resolveArticleVersion(article)

    return {
      status: "found",
      article,
      tags,
      version,
      canonicalCountry: normalizeCountryCode(countryCode),
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
  if (typeof stableId === "number" && Number.isFinite(stableId)) {
    const byId = await loadArticleByDatabaseId(countryCode, stableId, preview)
    if (byId.status === "found" || byId.status === "temporary_error") {
      return byId
    }
  }

  return loadArticleBySlug(countryCode, slug, preview)
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

=======
>>>>>>> f9432432 (refactor article rendering data flow to server-only wordpress path)
export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const normalizedPrimary = normalizeCountryCode(countryCode)
  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const supportedCountryEditions = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) => normalizeCountryCode(edition.code))

  return Array.from(new Set([normalizedPrimary, defaultSite, ...supportedCountryEditions]))
}

export const resetArticleCountryPriorityCache = (): void => {}
