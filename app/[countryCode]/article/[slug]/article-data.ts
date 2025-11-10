import { ENV } from "@/config/env"
import { CACHE_DURATIONS, KV_CACHE_KEYS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import {
  COUNTRIES,
  fetchWordPressGraphQL,
  type WordPressGraphQLFailure,
  type WordPressGraphQLSuccess,
} from "@/lib/wordpress/client"
import { fetchWithRetry } from "@/lib/utils/fetchWithRetry"
import { kvCache as articleKvCache, createCacheEntry } from "@/lib/cache/kv"
import type { WordPressPost } from "@/types/wp"
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress-queries"
import type { PostFieldsFragment } from "@/types/wpgraphql"
import { getRestBase } from "@/lib/wp-endpoints"
import { rewriteLegacyLinks } from "@/lib/utils/routing"

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()

export const normalizeSlug = (value: string): string => value.toLowerCase()

const ARTICLE_CACHE_TTL_SECONDS = CACHE_DURATIONS.SHORT

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

const buildFoundResult = (
  countryCode: string,
  slug: string,
  article: WordPressPost,
): LoadArticleResult => {
  const slugTag = cacheTags.postSlug(countryCode, slug)
  const tags = [slugTag]

  if (article.databaseId != null) {
    tags.push(cacheTags.post(countryCode, article.databaseId))
  }

  return { status: "found", article, tags }
}

const asLoadArticleResult = (
  countryCode: string,
  result: WordPressGraphQLSuccess<PostBySlugQueryResult>,
  slug: string,
): LoadArticleResult => {
  const node = result.posts?.nodes?.find(
    (value): value is PostFieldsFragment => Boolean(value),
  )

  if (!node) {
    return { status: "not_found" }
  }

  const article = mapGraphqlPostToWordPressPost(node, countryCode)
  return buildFoundResult(countryCode, slug, article)
}

type RestTerm = {
  id?: number
  name?: string
  slug?: string
  description?: string
}

type RestMediaDetails = {
  width?: number
  height?: number
}

type RestMedia = {
  source_url?: string
  alt_text?: string
  caption?: string
  media_details?: RestMediaDetails
}

type RestAuthor = {
  id?: number
  name?: string
  slug?: string
  description?: string
  avatar_urls?: Record<string, string>
}

interface WordPressRestPost {
  id?: number
  slug?: string
  link?: string
  date?: string
  modified?: string
  title?: { rendered?: string | null } | null
  excerpt?: { rendered?: string | null } | null
  content?: { rendered?: string | null } | null
  _embedded?: {
    author?: RestAuthor[]
    "wp:featuredmedia"?: RestMedia[]
    "wp:term"?: RestTerm[][]
  } | null
}

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429])

const getArticleCacheKey = (countryCode: string, slug: string): string =>
  KV_CACHE_KEYS.ARTICLE_BY_SLUG(normalizeCountryCode(countryCode), normalizeSlug(slug))

const persistArticleToCache = async (
  countryCode: string,
  slug: string,
  payload: LoadedArticle,
): Promise<void> => {
  if (!articleKvCache.isEnabled) {
    return
  }

  const key = getArticleCacheKey(countryCode, slug)

  try {
    await articleKvCache.set(key, createCacheEntry(payload), ARTICLE_CACHE_TTL_SECONDS)
  } catch (error) {
    console.error("Failed to cache article", { key, error })
  }
}

const readArticleFromCache = async (
  countryCode: string,
  slug: string,
): Promise<LoadedArticle | null> => {
  if (!articleKvCache.isEnabled) {
    return null
  }

  const key = getArticleCacheKey(countryCode, slug)

  try {
    const entry = await articleKvCache.get<LoadedArticle>(key)
    return entry?.value ?? null
  } catch (error) {
    console.error("Failed to read cached article", { key, error })
    return null
  }
}

const isRetryableFailure = (failure: WordPressGraphQLFailure): boolean => {
  if (failure.kind !== "http_error") {
    return false
  }

  if (failure.status >= 500) {
    return true
  }

  return RETRYABLE_HTTP_STATUS_CODES.has(failure.status)
}

const mapRestTermsToCategories = (terms: RestTerm[] | undefined): WordPressPost["categories"] => ({
  nodes:
    terms
      ?.filter((term): term is RestTerm & { slug: string } => Boolean(term?.slug))
      .map((term) => ({
        id: term.id,
        databaseId: term.id,
        name: term.name ?? undefined,
        slug: term.slug,
        description: term.description ?? undefined,
      })) ?? [],
})

const mapRestTermsToTags = (terms: RestTerm[] | undefined): WordPressPost["tags"] => ({
  nodes:
    terms
      ?.filter((term): term is RestTerm & { slug: string } => Boolean(term?.slug))
      .map((term) => ({
        id: term.id,
        databaseId: term.id,
        name: term.name ?? undefined,
        slug: term.slug,
      })) ?? [],
})

const resolveAuthorAvatar = (avatarUrls?: Record<string, string>) => {
  if (!avatarUrls) {
    return undefined
  }

  return (
    avatarUrls["96"] ??
    avatarUrls["72"] ??
    avatarUrls["48"] ??
    Object.values(avatarUrls)[0]
  )
}

const mapRestPostToWordPressPost = (
  post: WordPressRestPost,
  countryCode: string,
): WordPressPost => {
  const content = post.content?.rendered ?? ""
  const normalizedContent =
    typeof content === "string" && content.length > 0
      ? rewriteLegacyLinks(content, countryCode)
      : undefined

  const featured = post._embedded?.["wp:featuredmedia"]?.[0]
  const author = post._embedded?.author?.[0]
  const [categoryTerms, tagTerms] = post._embedded?.["wp:term"] ?? []

  let uri: string | undefined
  if (typeof post.link === "string") {
    try {
      uri = new URL(post.link).pathname
    } catch {
      uri = post.link
    }
  }

  return {
    databaseId: post.id ?? undefined,
    id: post.id != null ? String(post.id) : undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    modified: post.modified ?? undefined,
    title: post.title?.rendered ?? "",
    excerpt: post.excerpt?.rendered ?? "",
    content: normalizedContent,
    link: post.link ?? undefined,
    uri,
    featuredImage: featured
      ? {
          node: {
            sourceUrl: featured.source_url ?? undefined,
            altText: featured.alt_text ?? undefined,
            caption: typeof featured.caption === "string" ? featured.caption : undefined,
            mediaDetails: featured.media_details
              ? {
                  width: featured.media_details.width ?? undefined,
                  height: featured.media_details.height ?? undefined,
                }
              : undefined,
          },
        }
      : undefined,
    author: author
      ? {
          id: author.id,
          databaseId: author.id,
          name: author.name ?? "",
          slug: author.slug ?? "",
          description: author.description ?? undefined,
          avatar: {
            url: resolveAuthorAvatar(author.avatar_urls),
          },
          avatar_urls: author.avatar_urls,
          node: {
            id: author.id,
            databaseId: author.id,
            name: author.name ?? "",
            slug: author.slug ?? "",
            description: author.description ?? undefined,
            avatar: {
              url: resolveAuthorAvatar(author.avatar_urls),
            },
          },
        }
      : undefined,
    categories: mapRestTermsToCategories(categoryTerms),
    tags: mapRestTermsToTags(tagTerms),
  }
}

const fetchArticleFromRest = async (
  countryCode: string,
  slug: string,
): Promise<LoadArticleResult | null> => {
  const restBase = sanitizeBaseUrl(getRestBase(countryCode))
  const url = `${restBase}/posts?slug=${encodeURIComponent(slug)}&_embed=1`

  try {
    const response = await fetchWithRetry(url, {
      timeout: 10000,
      attempts: 2,
      next: { revalidate: CACHE_DURATIONS.SHORT },
    })

    if (!response.ok) {
      if (response.status >= 500 || RETRYABLE_HTTP_STATUS_CODES.has(response.status)) {
        console.error("WordPress REST fallback failed", {
          status: response.status,
          statusText: response.statusText,
          url,
        })
      }
      return null
    }

    const posts = (await response.json()) as WordPressRestPost[]
    const post = posts.find((entry) => normalizeSlug(entry.slug ?? "") === slug) ?? posts[0]

    if (!post) {
      return null
    }

    const article = mapRestPostToWordPressPost(post, countryCode)
    const result = buildFoundResult(countryCode, slug, article)
    void persistArticleToCache(countryCode, slug, {
      article: result.article,
      tags: result.tags,
    })
    return result
  } catch (error) {
    console.error("WordPress REST fallback threw", { error, url })
    return null
  }
}

export async function loadArticle(countryCode: string, slug: string): Promise<LoadArticleResult> {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const normalizedSlug = normalizeSlug(slug)

  if (!hasWordPressEndpoint(normalizedCountry)) {
    return { status: "not_found" }
  }

  const slugTag = cacheTags.postSlug(normalizedCountry, normalizedSlug)
  const requestTags = [slugTag]

  const attemptFallback = async (): Promise<LoadArticleResult | null> => {
    const restResult = await fetchArticleFromRest(normalizedCountry, normalizedSlug)
    if (restResult?.status === "found") {
      return restResult
    }

    const cached = await readArticleFromCache(normalizedCountry, normalizedSlug)
    if (cached) {
      return { status: "found", ...cached }
    }

    return null
  }

  try {
    const gqlResult = await fetchWordPressGraphQL<PostBySlugQueryResult>(
      normalizedCountry,
      POST_BY_SLUG_QUERY,
      { slug: normalizedSlug },
      { tags: requestTags, revalidate: CACHE_DURATIONS.SHORT },
    )

    if (!gqlResult.ok) {
      if (isRetryableFailure(gqlResult)) {
        const fallback = await attemptFallback()
        if (fallback) {
          return fallback
        }
      }

      return { status: "temporary_error", error: gqlResult.error, failure: gqlResult }
    }

    const result = asLoadArticleResult(normalizedCountry, gqlResult, normalizedSlug)

    if (result.status === "found") {
      void persistArticleToCache(normalizedCountry, normalizedSlug, {
        article: result.article,
        tags: result.tags,
      })
    }

    return result
  } catch (error) {
    const fallback = await attemptFallback()
    if (fallback) {
      return fallback
    }

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
