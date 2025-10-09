import { getGraphQLEndpoint, getRestBase } from "@/lib/wp-endpoints"
import {
  wordpressQueries,
  LATEST_POSTS_QUERY,
  FP_TAGGED_POSTS_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  CATEGORY_POSTS_BATCH_QUERY,
  CATEGORIES_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
  FEATURED_POSTS_QUERY,
  AUTHOR_DATA_QUERY,
  CATEGORY_POSTS_QUERY,
  FRONT_PAGE_SLICES_QUERY,
} from "./wordpress-queries"
import * as log from "./log"
import type { CircuitBreakerManager } from "./api/circuit-breaker"
import { fetchWithTimeout } from "./utils/fetchWithTimeout"
import { decodeHtmlEntities } from "./utils/decodeHtmlEntities"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapWpPost } from "./utils/mapWpPost"
import { APIError } from "./utils/errorHandling"
import type { HomePost } from "@/types/home"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "./editions"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import type {
  AuthorDataQuery,
  CategoryPostsBatchQuery,
  CategoryPostsQuery,
  CategoriesQuery,
  FeaturedPostsQuery,
  FpTaggedPostsQuery,
  LatestPostsQuery,
  PostCategoriesQuery,
  PostsByCategoryQuery,
  RelatedPostsQuery,
  PostFieldsFragment,
} from "@/types/wpgraphql"

type DeepMutable<T> = T extends ReadonlyArray<infer U>
  ? DeepMutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T

export type WordPressPost = DeepMutable<PostFieldsFragment> & { globalRelayId?: string | null }

let circuitBreakerInstance: CircuitBreakerManager | null = null
async function getCircuitBreaker(): Promise<CircuitBreakerManager> {
  if (!circuitBreakerInstance) {
    const { circuitBreaker } = await import("./api/circuit-breaker")
    circuitBreakerInstance = circuitBreaker
  }
  return circuitBreakerInstance
}

const mapPostFromWp = (post: unknown, countryCode?: string): WordPressPost =>
  mapWpPost(post as WordPressPost, "rest", countryCode)

const resolveHomePostId = (post: WordPressPost): string => {
  if (post.globalRelayId) {
    return post.globalRelayId
  }

  if (typeof post.id === "string" && post.id.length > 0) {
    return post.id
  }

  if (typeof post.databaseId === "number") {
    return String(post.databaseId)
  }

  if (post.slug && post.slug.length > 0) {
    return post.slug
  }

  return ""
}

const mapWordPressPostToHomePost = (post: WordPressPost, countryCode: string): HomePost => ({
  id: resolveHomePostId(post),
  globalRelayId: post.globalRelayId,
  slug: post.slug ?? "",
  title: decodeHtmlEntities(typeof post.title === "string" ? post.title : ""),
  excerpt: decodeHtmlEntities(typeof post.excerpt === "string" ? post.excerpt : ""),
  date: post.date ?? "",
  country: countryCode,
  featuredImage: post.featuredImage?.node
    ? {
        node: {
          sourceUrl: post.featuredImage.node.sourceUrl ?? undefined,
          altText: post.featuredImage.node.altText ?? undefined,
        },
      }
    : undefined,
})

const mapGraphqlNodeToHomePost = (post: unknown, countryCode: string): HomePost => {
  const mapped = mapWpPost(post as WordPressPost, "gql", countryCode)
  return mapWordPressPostToHomePost(mapped, countryCode)
}

export const mapPostsToHomePosts = (posts: WordPressPost[] | null | undefined, countryCode: string): HomePost[] => {
  if (!posts || posts.length === 0) {
    return []
  }
  return posts.map((post) => mapWordPressPostToHomePost(post, countryCode))
}

export interface PaginatedPostsResult {
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface FrontPageSlicesResult {
  hero: {
    heroPost?: WordPressPost
    secondaryStories: WordPressPost[]
  }
  trending: PaginatedPostsResult
  latest: PaginatedPostsResult
}

type RestFallbackContext = Record<string, unknown>

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }
  return { error }
}

const handleRestFallbackFailure = (message: string, context: RestFallbackContext, error: unknown): never => {
  const details = {
    ...context,
    error: toErrorDetails(error),
  }
  log.error(message, details)
  throw new APIError(message, "REST_FALLBACK_FAILED", undefined, details)
}

const buildCacheTagParam = (tags: string[]): string => Array.from(new Set(tags)).sort().join("|")

async function executeRestFallback<T>(
  operation: () => Promise<T | null | undefined>,
  message: string,
  context: RestFallbackContext,
  options?: { fallbackValue: T },
): Promise<T> {
  const logFallbackUsage = (reason: "empty-result" | "error", error?: unknown) => {
    const meta = {
      ...context,
      reason,
      fallbackUsed: true,
      ...(error ? { error: toErrorDetails(error) } : {}),
    }
    log.warn(message, meta)
  }

  try {
    const result = await operation()
    if (result === null || result === undefined) {
      if (options) {
        logFallbackUsage("empty-result")
        return options.fallbackValue
      }
      throw new Error("REST fallback returned no data")
    }
    return result
  } catch (error) {
    if (options) {
      logFallbackUsage("error", error)
      return options.fallbackValue
    }
    handleRestFallbackFailure(message, context, error)
    throw error instanceof Error ? error : new Error("REST fallback failed")
  }
}

export interface WordPressImage {
  sourceUrl?: string
  altText?: string
  mediaDetails?: {
    width?: number
    height?: number
  }
}

export interface WordPressAuthor {
  id: number
  name: string
  slug: string
  description?: string
  avatar?: { url?: string }
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
}

export interface CategoryPostsResult {
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface WordPressComment {
  id: number
  author_name: string
  content: { rendered: string }
  date: string
  status: string
  post: number
}

export interface CountryConfig {
  code: string
  name: string
  flag: string
  apiEndpoint: string
  restEndpoint: string
  canonicalUrl: string
  hreflang: string
  type?: "country"
}

export const COUNTRIES: Record<string, CountryConfig> = SUPPORTED_COUNTRY_EDITIONS.reduce(
  (acc, edition) => {
    acc[edition.code] = {
      code: edition.code,
      name: edition.name,
      flag: edition.flag,
      apiEndpoint: getGraphQLEndpoint(edition.code),
      restEndpoint: getRestBase(edition.code),
      canonicalUrl: edition.canonicalUrl,
      hreflang: edition.hreflang,
      type: "country",
    }
    return acc
  },
  {} as Record<string, CountryConfig>,
)

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
const REST_CATEGORY_CACHE_TTL_MS = CACHE_DURATIONS.SHORT * 1000

interface CachedCategoryPosts {
  posts: WordPressPost[]
  expiresAt: number
}

const restCategoryPostsCache = new Map<string, CachedCategoryPosts>()

const buildCategoryCacheKey = (countryCode: string, categoryId: number | string, limit: number) =>
  `${countryCode}:${categoryId}:${limit}`

interface WordPressGraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; [key: string]: unknown }>
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  const username = process.env.WP_APP_USERNAME
  const password = process.env.WP_APP_PASSWORD
  if (username && password) {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64")
    headers["Authorization"] = `Basic ${credentials}`
  }
  // Note: If no credentials, WordPress allows public access to public posts

  return headers
}

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  tags?: string[],
): Promise<T | null> {
  const breaker = await getCircuitBreaker()
  const breakerKey = `wordpress-graphql-${countryCode}`
  const endpointMeta = { country: countryCode, endpoint: "graphql" }

  try {
    return await breaker.execute(
      breakerKey,
      async () => {
        const base = getGraphQLEndpoint(countryCode)
        console.log("[v0] GraphQL request to:", base)

        let logged = false
        try {
          const res = await fetchWithTimeout(base, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ query, variables }),
            next: {
              revalidate: CACHE_DURATIONS.MEDIUM,
              ...(tags && tags.length > 0 ? { tags } : {}),
            },
            timeout: 10000,
          })

          if (!res.ok) {
            logged = true
            console.error("[v0] GraphQL request failed:", res.status, res.statusText)
            log.error(`WordPress GraphQL request failed for ${base}`, {
              status: res.status,
              statusText: res.statusText,
            })
            throw new Error(`WordPress GraphQL request failed with status ${res.status}`)
          }

          const json = (await res.json()) as WordPressGraphQLResponse<T>

          if (json.errors && json.errors.length > 0) {
            logged = true
            console.error("[v0] GraphQL errors:", json.errors)
            log.error(`WordPress GraphQL errors for ${base}`, { errors: json.errors })
            throw new Error("WordPress GraphQL response contained errors")
          }

          console.log("[v0] GraphQL request successful")
          return (json.data ?? null) as T | null
        } catch (error) {
          if (!logged) {
            console.error("[v0] GraphQL request exception:", error)
            log.error(`WordPress GraphQL request failed for ${base}`, { error })
          }
          throw error instanceof Error ? error : new Error("WordPress GraphQL request failed")
        }
      },
      undefined,
      endpointMeta,
    )
  } catch {
    return null
  }
}

export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, string | number | string[] | undefined>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders?: boolean; tags?: string[] } | number = {},
): Promise<{ data: T; headers: Headers } | T | null> {
  const normalizedOpts =
    typeof opts === "number"
      ? { timeout: opts, withHeaders: false, tags: undefined as string[] | undefined }
      : (opts ?? {})

  const { timeout = 10000, withHeaders = false, tags } = normalizedOpts

  const { method = "GET", payload, params: queryParams = {}, endpoint } = query

  const base = getRestBase(countryCode)
  const cacheTag = tags && tags.length > 0 ? buildCacheTagParam(tags) : undefined
  const searchParamsEntries = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)])

  if (cacheTag) {
    searchParamsEntries.push(["cacheTag", cacheTag])
  }

  const params = new URLSearchParams(searchParamsEntries).toString()
  const url = `${base}/${endpoint}${params ? `?${params}` : ""}`

  const breaker = await getCircuitBreaker()
  const sanitizedEndpoint = query.endpoint.replace(/[^a-zA-Z0-9:_-]/g, "-")
  const breakerKey = `wordpress-rest-${countryCode}-${sanitizedEndpoint}`
  const endpointMeta = { country: countryCode, endpoint: `rest:${query.endpoint}` }

  try {
    return await breaker.execute(
      breakerKey,
      async () => {
        console.log("[v0] REST request to:", url)

        let logged = false
        try {
          const res = await fetchWithTimeout(url, {
            method,
            headers: getAuthHeaders(),
            next: {
              revalidate: CACHE_DURATIONS.MEDIUM,
              ...(tags && tags.length > 0 ? { tags } : {}),
            },
            ...(payload ? { body: JSON.stringify(payload) } : {}),
            timeout,
          })

          if (!res.ok) {
            logged = true
            console.error("[v0] REST request failed:", res.status, res.statusText)
            log.error(`WordPress API error ${res.status} for ${url}`, {
              statusText: res.statusText,
            })
            throw new Error(`WordPress REST request failed with status ${res.status}`)
          }

          const rawData = await res.json()
          let data: T

          if (query.endpoint.startsWith("posts")) {
            if (Array.isArray(rawData)) {
              data = rawData.map((p: WordPressPost) => mapPostFromWp(p, countryCode)) as T
            } else {
              data = mapPostFromWp(rawData as WordPressPost, countryCode) as T
            }
          } else {
            data = rawData as T
          }

          console.log("[v0] REST request successful")
          if (withHeaders) {
            return { data: data as T, headers: res.headers }
          }
          return data as T
        } catch (error) {
          if (!logged) {
            console.error("[v0] REST request exception:", error)
            log.error(`WordPress API request failed for ${url}`, { error })
          }
          throw error instanceof Error ? error : new Error("WordPress REST request failed")
        }
      },
      undefined,
      endpointMeta,
    )
  } catch {
    return null
  }
}

const decodeCursorIndex = (cursor: string | null | undefined) => {
  if (!cursor) {
    return null
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8")
    const parts = decoded.split(":")
    const lastPart = parts[parts.length - 1]
    const index = Number.parseInt(lastPart || "", 10)

    return Number.isNaN(index) ? null : index
  } catch (error) {
    log.warn("[v0] Failed to decode pagination cursor for REST fallback", {
      cursor,
      error: toErrorDetails(error),
    })
    return null
  }
}

const cursorToOffset = (cursor: string | null | undefined) => {
  const index = decodeCursorIndex(cursor)
  if (index === null) {
    return null
  }

  return index + 1
}

type FrontPageSlicesQueryResult = {
  hero?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
  latest?: {
    pageInfo?: {
      endCursor?: string | null
      hasNextPage?: boolean | null
    } | null
    edges?: ({ cursor?: string | null; node?: PostFieldsFragment | null } | null)[] | null
  } | null
}

const FRONT_PAGE_HERO_LIMIT = 8
const FRONT_PAGE_HERO_FALLBACK_LIMIT = 3
const FRONT_PAGE_TRENDING_LIMIT = 7
const FRONT_PAGE_LATEST_LIMIT = 20
const FRONT_PAGE_HERO_TAGS = ["fp"] as const

const createEmptyFrontPageSlices = (): FrontPageSlicesResult => ({
  hero: { heroPost: undefined, secondaryStories: [] },
  trending: { posts: [], hasNextPage: false, endCursor: null },
  latest: { posts: [], hasNextPage: false, endCursor: null },
})

type BuildFrontPageSlicesOptions = {
  heroPosts: WordPressPost[]
  generalPosts: WordPressPost[]
  heroFallbackLimit: number
  trendingLimit: number
  latestLimit: number
  cursors?: (string | null)[]
  pageInfo?: { endCursor?: string | null; hasNextPage?: boolean | null } | null
}

const buildFrontPageSlices = ({
  heroPosts,
  generalPosts,
  heroFallbackLimit,
  trendingLimit,
  latestLimit,
  cursors,
  pageInfo,
}: BuildFrontPageSlicesOptions): FrontPageSlicesResult => {
  const heroFallback = generalPosts.slice(0, heroFallbackLimit)
  const heroSource = heroPosts.length > 0 ? heroPosts : heroFallback
  const heroPost = heroSource[0]
  const secondaryStories = heroSource.slice(1, 5)

  const trendingPosts = generalPosts.slice(heroFallbackLimit, heroFallbackLimit + trendingLimit)
  const latestPosts = generalPosts.slice(
    heroFallbackLimit + trendingLimit,
    heroFallbackLimit + trendingLimit + latestLimit,
  )

  const trendingEndIndex = heroFallbackLimit + trendingPosts.length - 1
  const latestEndIndex = heroFallbackLimit + trendingLimit + latestPosts.length - 1

  const safeCursorAt = (index: number) => {
    if (!cursors || index < 0) {
      return null
    }
    return cursors[index] ?? null
  }

  const trendingEndCursor = trendingPosts.length > 0 ? safeCursorAt(trendingEndIndex) : null
  const latestEndCursor = latestPosts.length > 0 ? safeCursorAt(latestEndIndex) : null

  const totalGeneral = generalPosts.length
  const consumedForTrending = heroFallbackLimit + trendingPosts.length
  const consumedForLatest = consumedForTrending + latestPosts.length

  const trendingHasNextPage = totalGeneral > consumedForTrending || Boolean(pageInfo?.hasNextPage)
  const latestHasNextPage = totalGeneral > consumedForLatest || Boolean(pageInfo?.hasNextPage)

  return {
    hero: { heroPost, secondaryStories },
    trending: {
      posts: trendingPosts,
      hasNextPage: trendingHasNextPage,
      endCursor: trendingEndCursor ?? pageInfo?.endCursor ?? null,
    },
    latest: {
      posts: latestPosts,
      hasNextPage: latestHasNextPage,
      endCursor: latestEndCursor ?? pageInfo?.endCursor ?? null,
    },
  }
}

const fetchFrontPageSlicesViaRest = async (
  countryCode: string,
  {
    heroFallbackLimit,
    trendingLimit,
    latestLimit,
  }: { heroFallbackLimit: number; trendingLimit: number; latestLimit: number },
  tags: string[],
): Promise<FrontPageSlicesResult> => {
  const totalLatest = heroFallbackLimit + trendingLimit + latestLimit

  try {
    const { endpoint, params } = wordpressQueries.recentPosts(totalLatest)
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
      `[v0] Frontpage slices REST fallback failed for ${countryCode}`,
      { countryCode, endpoint, params },
      { fallbackValue: [] },
    )

    const mapped = posts.map((post) => mapPostFromWp(post, countryCode))
    return buildFrontPageSlices({
      heroPosts: [],
      generalPosts: mapped,
      heroFallbackLimit,
      trendingLimit,
      latestLimit,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch frontpage slices via REST:", error)
    return createEmptyFrontPageSlices()
  }
}

export async function getFrontPageSlicesForCountry(
  countryCode: string,
  options?: {
    heroLimit?: number
    heroFallbackLimit?: number
    trendingLimit?: number
    latestLimit?: number
  },
): Promise<FrontPageSlicesResult> {
  const heroLimit = options?.heroLimit ?? FRONT_PAGE_HERO_LIMIT
  const heroFallbackLimit = options?.heroFallbackLimit ?? FRONT_PAGE_HERO_FALLBACK_LIMIT
  const trendingLimit = options?.trendingLimit ?? FRONT_PAGE_TRENDING_LIMIT
  const latestLimit = options?.latestLimit ?? FRONT_PAGE_LATEST_LIMIT

  const totalLatest = heroFallbackLimit + trendingLimit + latestLimit
  const tags = buildCacheTags({
    country: countryCode,
    section: "frontpage",
    extra: ["batched"],
  })

  try {
    console.log("[v0] Fetching frontpage slices for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<FrontPageSlicesQueryResult>(
      countryCode,
      FRONT_PAGE_SLICES_QUERY,
      {
        heroFirst: heroLimit,
        heroTagSlugs: FRONT_PAGE_HERO_TAGS,
        latestFirst: totalLatest,
      },
      tags,
    )

    if (gqlData) {
      const heroNodes = gqlData.hero?.nodes?.filter((node): node is PostFieldsFragment => Boolean(node)) ?? []
      const heroPosts = heroNodes.map((node) => mapWpPost(node, "gql", countryCode))

      const latestEdges =
        gqlData.latest?.edges?.filter((edge): edge is { cursor?: string | null; node: PostFieldsFragment } =>
          Boolean(edge?.node),
        ) ?? []

      const generalPosts = latestEdges.map((edge) => mapWpPost(edge.node, "gql", countryCode))
      const cursors = latestEdges.map((edge) => edge.cursor ?? null)

      if (heroPosts.length > 0 || generalPosts.length > 0) {
        return buildFrontPageSlices({
          heroPosts,
          generalPosts,
          heroFallbackLimit,
          trendingLimit,
          latestLimit,
          cursors,
          pageInfo: gqlData.latest?.pageInfo ?? null,
        })
      }
    }

    console.log("[v0] GraphQL returned no data for frontpage slices, falling back to REST")
  } catch (error) {
    console.error("[v0] Failed to fetch frontpage slices via GraphQL:", error)
  }

  return fetchFrontPageSlicesViaRest(countryCode, { heroFallbackLimit, trendingLimit, latestLimit }, tags)
}

export async function getFpTaggedPostsForCountry(countryCode: string, limit = 8): Promise<HomePost[]> {
  const tags = buildCacheTags({ country: countryCode, section: "frontpage", extra: ["tag:fp"] })

  try {
    console.log("[v0] Fetching FP tagged posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<FpTaggedPostsQuery>(
      countryCode,
      FP_TAGGED_POSTS_QUERY,
      {
        tagSlugs: ["fp"],
        first: limit,
      },
      tags,
    )

    const nodes = gqlData?.posts?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node))
    if (nodes && nodes.length > 0) {
      console.log("[v0] Found", nodes.length, "FP tagged posts via GraphQL")
      return nodes.map((node) => mapGraphqlNodeToHomePost(node, countryCode))
    }

    console.log("[v0] No GraphQL results, trying REST fallback")

    try {
      const tagResult = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug("fp"), { tags })

      if (!tagResult || !Array.isArray(tagResult) || tagResult.length === 0) {
        console.log("[v0] No FP tag found")
        return []
      }

      const tag = tagResult[0]
      const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
      const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags })

      if (!posts || !Array.isArray(posts)) {
        console.log("[v0] No FP tagged posts found via REST")
        return []
      }

      const normalizedPosts = posts.map((post) =>
        mapWordPressPostToHomePost(mapPostFromWp(post, countryCode), countryCode),
      )

      console.log("[v0] Found", normalizedPosts.length, "FP tagged posts via REST")
      return normalizedPosts
    } catch (restError) {
      console.error("[v0] REST fallback failed for FP tagged posts:", restError)
      return []
    }
  } catch (error) {
    console.error("[v0] Failed to fetch FP tagged posts:", error)
    return []
  }
}

export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 20,
  cursor?: string | null,
): Promise<PaginatedPostsResult> {
  const tags = buildCacheTags({ country: countryCode, section: "news" })

  try {
    console.log("[v0] Fetching latest posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<LatestPostsQuery>(
      countryCode,
      LATEST_POSTS_QUERY,
      {
        first: limit,
        ...(cursor ? { after: cursor } : {}),
      },
      tags,
    )

    if (gqlData?.posts) {
      const nodes = gqlData.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
      const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
      console.log("[v0] Found", posts.length, "latest posts via GraphQL")
      return {
        posts,
        hasNextPage: gqlData.posts.pageInfo.hasNextPage,
        endCursor: gqlData.posts.pageInfo.endCursor ?? null,
      }
    }

    console.log("[v0] No GraphQL results, trying REST fallback")

    const { endpoint, params } = wordpressQueries.recentPosts(limit)
    const offset = cursorToOffset(cursor ?? null)
    const restParams = offset !== null ? { ...params, offset } : params
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params: restParams }, { tags }),
      `[v0] Latest posts REST fallback failed for ${countryCode}`,
      { countryCode, limit, endpoint, params: restParams },
      { fallbackValue: [] },
    )

    console.log("[v0] Found", posts.length, "latest posts via REST")
    return {
      posts,
      hasNextPage: posts.length === limit,
      endCursor: null,
    }
  } catch (error) {
    console.error("[v0] Failed to fetch latest posts:", error)
    return {
      posts: [],
      hasNextPage: false,
      endCursor: null,
    }
  }
}

export async function getPostsForCategories(
  countryCode: string,
  categorySlugs: string[],
  limit = 20,
): Promise<Record<string, CategoryPostsResult>> {
  const normalizedSlugs = Array.from(
    new Set(categorySlugs.map((slug) => slug?.trim().toLowerCase()).filter((slug): slug is string => Boolean(slug))),
  )

  if (normalizedSlugs.length === 0) {
    return {}
  }

  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: normalizedSlugs.map((slug) => `category:${slug}`),
  })

  const ensureEntry = (results: Record<string, CategoryPostsResult>, slug: string) => {
    if (!results[slug]) {
      results[slug] = {
        category: null,
        posts: [],
        hasNextPage: false,
        endCursor: null,
      }
    }
  }

  const results: Record<string, CategoryPostsResult> = {}

  const gqlData = await fetchFromWpGraphQL<CategoryPostsBatchQuery>(
    countryCode,
    CATEGORY_POSTS_BATCH_QUERY,
    {
      slugs: normalizedSlugs,
      first: limit,
    },
    tags,
  )

  if (gqlData?.categories?.nodes?.length) {
    console.log("[v0] Category posts fetched:", gqlData.categories.nodes.length, "categories")
    gqlData.categories.nodes.forEach((node) => {
      if (!node?.slug) {
        return
      }

      const slug = String(node.slug).toLowerCase()
      const category: WordPressCategory = {
        id: node.databaseId ?? 0,
        name: node.name ?? "",
        slug: node.slug,
        description: node.description ?? undefined,
        count: node.count ?? undefined,
      }

      const nodes = node.posts?.nodes?.filter((post): post is NonNullable<typeof post> => Boolean(post)) ?? []
      const posts = nodes.map((post) => mapWpPost(post, "gql", countryCode))

      results[slug] = {
        category,
        posts,
        hasNextPage: node.posts?.pageInfo?.hasNextPage ?? false,
        endCursor: node.posts?.pageInfo?.endCursor ?? null,
      }
    })

    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  }

  console.log("[v0] GraphQL failed, falling back to REST for categories")

  try {
    const categories = await fetchFromWp<any[]>(countryCode, wordpressQueries.categoriesBySlugs(normalizedSlugs), {
      tags,
    })

    if (!categories || categories.length === 0) {
      console.log("[v0] No categories found via REST")
      normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
      return results
    }

    const categoriesBySlug = new Map<string, WordPressCategory>()
    categories.forEach((cat: any) => {
      if (!cat?.slug) {
        return
      }

      const slug = String(cat.slug).toLowerCase()
      categoriesBySlug.set(slug, {
        id: cat.id ?? cat.databaseId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? undefined,
        count: cat.count ?? undefined,
      })
    })

    for (const slug of normalizedSlugs) {
      const category = categoriesBySlug.get(slug) ?? null

      if (!category) {
        ensureEntry(results, slug)
        continue
      }

      const cacheKey = buildCategoryCacheKey(countryCode, category.id, limit)
      const cached = restCategoryPostsCache.get(cacheKey)
      let posts: WordPressPost[] = []

      if (cached && cached.expiresAt > Date.now()) {
        posts = cached.posts
      } else {
        const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
        try {
          const fetchedPosts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags })
          posts = fetchedPosts || []

          restCategoryPostsCache.set(cacheKey, {
            posts,
            expiresAt: Date.now() + REST_CATEGORY_CACHE_TTL_MS,
          })
        } catch (error) {
          console.error(`[v0] Failed to fetch posts for category ${category.slug}:`, error)
          restCategoryPostsCache.delete(cacheKey)
          posts = []
        }
      }

      results[slug] = {
        category,
        posts,
        hasNextPage: posts.length === limit,
        endCursor: null,
      }
    }

    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  } catch (error) {
    console.error("[v0] REST fallback failed for categories:", error)
    normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
    return results
  }
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
): Promise<CategoryPostsResult> {
  const slug = categorySlug.trim().toLowerCase()
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: slug ? [`category:${slug}`] : undefined,
  })

  const gqlData = await fetchFromWpGraphQL<PostsByCategoryQuery>(
    countryCode,
    POSTS_BY_CATEGORY_QUERY,
    {
      category: categorySlug,
      first: limit,
    },
    tags,
  )
  if (gqlData?.posts && gqlData?.categories) {
    const catNode = gqlData.categories.nodes?.[0] ?? null
    const category = catNode
      ? {
          id: catNode.databaseId ?? 0,
          name: catNode.name ?? "",
          slug: catNode.slug ?? slug,
          description: catNode.description ?? undefined,
          count: catNode.count ?? undefined,
        }
      : null
    const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
    const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
    return {
      category,
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor ?? null,
    }
  }
  const categories = await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, wordpressQueries.categoryBySlug(categorySlug), { tags }),
    `[v0] Category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug },
    { fallbackValue: [] },
  )
  const category = categories[0]
  if (!category) {
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Posts by category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug, categoryId: category.id, limit, endpoint, params },
    { fallbackValue: [] },
  )
  return { category, posts, hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const tags = buildCacheTags({ country: countryCode, section: "categories" })

  const gqlData = await fetchFromWpGraphQL<CategoriesQuery>(countryCode, CATEGORIES_QUERY, undefined, tags)
  if (gqlData?.categories?.nodes) {
    return gqlData.categories.nodes
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        id: c.databaseId ?? 0,
        name: c.name ?? "",
        slug: c.slug ?? "",
        description: c.description ?? undefined,
        count: c.count ?? undefined,
      }))
  }
  const { endpoint, params } = wordpressQueries.categories()
  return await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Categories REST fallback failed for ${countryCode}`,
    { countryCode, endpoint, params },
    { fallbackValue: [] },
  )
}

export async function getRelatedPostsForCountry(countryCode: string, postId: string, limit = 6) {
  const tags = buildCacheTags({ country: countryCode, section: "related", extra: [`post:${postId}`] })

  const gqlPost = await fetchFromWpGraphQL<PostCategoriesQuery>(
    countryCode,
    POST_CATEGORIES_QUERY,
    { id: Number(postId) },
    tags,
  )
  if (gqlPost?.post) {
    const catIds =
      gqlPost.post.categories?.nodes
        ?.filter((c): c is NonNullable<typeof c> => typeof c?.databaseId === "number")
        .map((c) => Number(c!.databaseId)) ?? []
    if (catIds.length > 0) {
      const gqlData = await fetchFromWpGraphQL<RelatedPostsQuery>(
        countryCode,
        RELATED_POSTS_QUERY,
        {
          catIds,
          exclude: Number(postId),
          first: limit,
        },
        tags,
      )
      if (gqlData?.posts) {
        const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
        const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
        return posts.filter((p) => p.databaseId !== Number(postId))
      }
    }
  }
  const post = await executeRestFallback(
    () => fetchFromWp<WordPressPost | null>(countryCode, wordpressQueries.postById(postId), { tags }),
    `[v0] Related posts REST fallback failed for base post ${postId} (${countryCode})`,
    { countryCode, postId },
    { fallbackValue: null },
  )
  if (!post) {
    return []
  }
  const categoryIds: number[] =
    post.categories?.nodes
      ?.map((cat) => (typeof cat?.databaseId === "number" ? Number(cat.databaseId) : null))
      .filter((id): id is number => id !== null) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Related posts REST fallback failed for ${postId} (${countryCode})`,
    { countryCode, postId, categoryIds, limit, endpoint, params },
    { fallbackValue: [] },
  )
  return posts.filter((p) => p.databaseId !== Number(postId))
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const cacheTags = buildCacheTags({ country: countryCode, section: "featured", extra: ["tag:featured"] })

  const gqlData = await fetchFromWpGraphQL<FeaturedPostsQuery>(
    countryCode,
    FEATURED_POSTS_QUERY,
    {
      tag: "featured",
      first: limit,
    },
    cacheTags,
  )
  if (gqlData?.posts) {
    const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
    return nodes.map((p) => mapWpPost(p, "gql", countryCode))
  }
  const tags = await executeRestFallback(
    () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug("featured"), { tags: cacheTags }),
    `[v0] Featured tag REST fallback failed for ${countryCode}`,
    { countryCode },
    { fallbackValue: [] },
  )
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags }),
    `[v0] Featured posts REST fallback failed for ${countryCode}`,
    { countryCode, tagId: tag.id, limit, endpoint, params },
    { fallbackValue: [] },
  )
}

export const getLatestPosts = (limit = 20) => getLatestPostsForCountry(DEFAULT_COUNTRY, limit)

export interface AggregatedHomeData {
  heroPost: HomePost | null
  secondaryPosts: HomePost[]
  remainingPosts: HomePost[]
}

const getPostTimestamp = (post: HomePost): number => {
  const timestamp = new Date(post.date).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export async function getAggregatedLatestHome(limitPerCountry = 6): Promise<AggregatedHomeData> {
  const fallback: AggregatedHomeData = {
    heroPost: null,
    secondaryPosts: [],
    remainingPosts: [],
  }

  try {
    const results = await Promise.allSettled(
      SUPPORTED_COUNTRY_EDITIONS.map((country) =>
        getFpTaggedPostsForCountry(country.code, limitPerCountry),
      ),
    )

    const aggregatedPosts: HomePost[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        aggregatedPosts.push(...result.value)
      } else {
        const failedCountry = SUPPORTED_COUNTRY_EDITIONS[index]
        log.error("[v0] Failed to fetch aggregated latest posts", {
          country: failedCountry?.code,
          error: result.reason instanceof Error ? result.reason.message : result.reason,
        })
      }
    })

    if (aggregatedPosts.length === 0) {
      return fallback
    }

    aggregatedPosts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))

    const uniquePosts: HomePost[] = []
    const seen = new Set<string>()

    for (const post of aggregatedPosts) {
      const key = post.globalRelayId ?? `${post.country ?? ""}:${post.slug}`
      if (!seen.has(key)) {
        seen.add(key)
        uniquePosts.push(post)
      }
    }

    const heroPost = uniquePosts[0] ?? null
    const secondaryPosts = uniquePosts.slice(1, 4)
    const remainingPosts = uniquePosts.slice(4)

    return {
      heroPost,
      secondaryPosts,
      remainingPosts,
    }
  } catch (error) {
    log.error("[v0] Aggregated latest posts request failed", error)
    return fallback
  }
}
export const getPostsByCategory = (slug: string, limit = 20) =>
  getPostsByCategoryForCountry(DEFAULT_COUNTRY, slug, limit)
export const getCategories = () => getCategoriesForCountry(DEFAULT_COUNTRY)
export const getRelatedPosts = async (
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
): Promise<WordPressPost[]> => {
  const country = countryCode || DEFAULT_COUNTRY

  if (tags.length > 0) {
    const { endpoint, params } = wordpressQueries.relatedPostsByTags(tags, postId, limit)
    const cacheTags = buildCacheTags({
      country,
      section: "related",
      extra: [`post:${postId}`, ...tags.map((tagSlug) => `tag:${tagSlug}`)],
    })
    try {
      const posts = await executeRestFallback(
        () => fetchFromWp<WordPressPost[]>(country, { endpoint, params }, { tags: cacheTags }),
        `[v0] Related posts by tags REST fallback failed for ${postId} (${country})`,
        { country, postId, tags, limit, endpoint, params },
        { fallbackValue: [] },
      )
      return posts.filter((p) => p.id !== Number(postId))
    } catch (error) {
      log.error(`[v0] Related posts by tags request failed for ${postId}`, {
        country,
        postId,
        tags,
        error,
      })
      return []
    }
  }

  const posts = await getRelatedPostsForCountry(country, postId, limit)
  return posts.filter((p) => p.id !== Number(postId))
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") {
    return decodeHtmlEntities(value)
  }
  if (
    value &&
    typeof value === "object" &&
    "rendered" in value &&
    typeof (value as { rendered?: unknown }).rendered === "string"
  ) {
    return decodeHtmlEntities((value as { rendered?: string }).rendered ?? "")
  }
  return ""
}

type MaybeMostReadPost = Partial<HomePost> & {
  id?: string | number
  slug?: string
  title?: string | { rendered?: string }
  excerpt?: string | { rendered?: string }
  date?: string
  country?: string
  featuredImage?:
    | HomePost["featuredImage"]
    | {
        node?: {
          sourceUrl?: string
          altText?: string
          source_url?: string
          alt_text?: string
          url?: string
          alt?: string
        }
      }
  featured_image?:
    | HomePost["featuredImage"]
    | {
        node?: {
          sourceUrl?: string
          altText?: string
          source_url?: string
          alt_text?: string
          url?: string
          alt?: string
        }
      }
  featuredImageUrl?: string
  featured_image_url?: string
}

const normalizeFeaturedImage = (post: MaybeMostReadPost): HomePost["featuredImage"] | undefined => {
  const candidate = post.featuredImage || post.featured_image
  if (candidate && typeof candidate === "object" && "node" in candidate && candidate.node) {
    const node = candidate.node as Record<string, unknown>
    const sourceUrl =
      typeof node?.sourceUrl === "string"
        ? (node.sourceUrl as string)
        : typeof node?.source_url === "string"
          ? (node.source_url as string)
          : typeof node?.url === "string"
            ? (node.url as string)
            : undefined
    const altText =
      typeof node?.altText === "string"
        ? (node.altText as string)
        : typeof node?.alt_text === "string"
          ? (node.alt_text as string)
          : typeof node?.alt === "string"
            ? (node.alt as string)
            : undefined

    if (sourceUrl) {
      return {
        node: {
          sourceUrl,
          altText,
        },
      }
    }
  }

  const directSource =
    typeof post.featuredImageUrl === "string"
      ? post.featuredImageUrl
      : typeof post.featured_image_url === "string"
        ? post.featured_image_url
        : undefined

  if (directSource) {
    return {
      node: {
        sourceUrl: directSource,
      },
    }
  }

  return undefined
}

const normalizeMostReadPost = (post: unknown, fallbackCountry: string): HomePost | null => {
  if (!post || typeof post !== "object") {
    return null
  }

  const item = post as MaybeMostReadPost
  const slug = typeof item.slug === "string" ? item.slug : ""
  const title = resolveRenderedText(item.title)
  if (!slug || !title) {
    return null
  }

  const idValue = item.id ?? slug
  const id = typeof idValue === "string" ? idValue : String(idValue)
  const excerpt = resolveRenderedText(item.excerpt)
  const date = typeof item.date === "string" ? item.date : ""
  const country = typeof item.country === "string" ? item.country : fallbackCountry
  const featuredImage = normalizeFeaturedImage(item)

  return {
    id,
    slug,
    title,
    excerpt,
    date,
    country,
    featuredImage,
  }
}

export const fetchMostReadPosts = async (countryCode = DEFAULT_COUNTRY, limit = 5): Promise<HomePost[]> => {
  const params = new URLSearchParams({ country: countryCode })
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    params.set("limit", String(Math.floor(limit)))
  }

  const response = await fetch(`/api/most-read?${params.toString()}`)
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || "Failed to load most-read posts")
  }

  const payload = await response.json().catch(() => [])
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map((post) => normalizeMostReadPost(post, countryCode))
    .filter((post): post is HomePost => Boolean(post))
}

export const fetchRecentPosts = async (limit = 20, countryCode = DEFAULT_COUNTRY) => {
  try {
    const { posts } = await getLatestPostsForCountry(countryCode, limit)
    return posts
  } catch (error) {
    console.error("[v0] Failed to fetch recent posts during build:", error)
    return []
  }
}

export const fetchTaggedPosts = async (tagSlug: string, limit = 10, countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "tags",
    extra: [`tag:${tagSlug}`],
  })

  const tags =
    (await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(tagSlug), {
      tags: cacheTags,
    })) || []
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
  return (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags })) || []
}

export async function fetchPosts(
  options:
    | number
    | {
        page?: number
        perPage?: number
        category?: string
        tag?: string
        search?: string
        author?: string
        featured?: boolean
        countryCode?: string
        ids?: Array<number | string>
        countryTermId?: number
      } = {},
) {
  if (typeof options === "number") {
    const { endpoint, params } = wordpressQueries.recentPosts(options)
    const tags = buildCacheTags({ country: DEFAULT_COUNTRY, section: "news" })
    return (await fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params }, { tags })) || []
  }

  const {
    page = 1,
    perPage = 10,
    category,
    tag,
    search,
    author,
    featured,
    countryCode = DEFAULT_COUNTRY,
    ids,
    countryTermId,
  } = options

  const extraTags = [
    category ? `category:${category}` : null,
    tag ? `tag:${tag}` : null,
    author ? `author:${author}` : null,
    featured ? "filter:featured" : null,
    search ? `search:${search}` : null,
    ids && ids.length > 0 ? `ids:${ids.map(String).sort().join("-")}` : null,
    typeof countryTermId === "number" ? `country-term:${countryTermId}` : null,
  ]
  const cacheTags = buildCacheTags({ country: countryCode, section: "posts", extra: extraTags })

  const query = wordpressQueries.posts({
    page,
    perPage,
    category,
    tag,
    search,
    author,
    featured,
    ids,
    countryTermId,
  })
  const result = await fetchFromWp<WordPressPost[]>(countryCode, query, {
    withHeaders: true,
    tags: cacheTags,
  })
  const total = Number(result?.headers.get("X-WP-Total") || "0")
  const data = result?.data || []
  return { data, total }
}

export const fetchCategories = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    return await getCategoriesForCountry(countryCode)
  } catch (error) {
    console.error("[v0] Failed to fetch categories during build:", error)
    return []
  }
}

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const { endpoint, params } = wordpressQueries.tags()
    const tags = buildCacheTags({ country: countryCode, section: "tags" })
    const result = await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params }, { tags })
    return result || []
  } catch (error) {
    console.error("[v0] Failed to fetch tags during build:", error)
    return []
  }
}

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.authors()
  const tags = buildCacheTags({ country: countryCode, section: "authors" })
  return (await fetchFromWp<WordPressAuthor[]>(countryCode, { endpoint, params }, { tags })) || []
}

export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const base = getRestBase(process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY)
  const res = await fetch(`${base}/countries?slug=${slug}`)
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0]?.id ?? null
}

export async function fetchPost({
  slug,
  countryCode = DEFAULT_COUNTRY,
  countryTermId,
}: {
  slug: string
  countryCode?: string
  countryTermId?: number
}) {
  const { endpoint, params } = wordpressQueries.postBySlug(slug)
  if (countryTermId) params.countries = countryTermId
  const tags = buildCacheTags({ country: countryCode, section: "post", extra: [`slug:${slug}`] })
  const posts = await fetchFromWp<WordPressPost[]>(
    countryCode,
    {
      endpoint,
      params,
    },
    { tags },
  )
  return posts?.[0] || null
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({ country: countryCode, section: "tags", extra: [`tag:${slug}`] })
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(slug), {
    tags: cacheTags,
  })
  return tags?.[0] || null
}

export const fetchAllTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  const tags = buildCacheTags({ country: countryCode, section: "tags" })
  return (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params }, { tags })) || []
}

export async function fetchAuthorData(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
  limit = 10,
) {
  const tags = buildCacheTags({
    country: countryCode,
    section: "authors",
    extra: [`author:${slug}`],
  })

  const data = await fetchFromWpGraphQL<AuthorDataQuery>(
    countryCode,
    AUTHOR_DATA_QUERY,
    {
      slug,
      after: cursor,
      first: limit,
    },
    tags,
  )
  if (!data?.user) return null
  const nodes = data.user.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
  return {
    ...data.user,
    posts: {
      nodes: nodes.map((p) => mapWpPost(p, "gql", countryCode)),
      pageInfo: {
        ...data.user.posts.pageInfo,
        endCursor: data.user.posts.pageInfo.endCursor ?? null,
      },
    },
  }
}

interface AuthorLookupResult {
  author: WordPressAuthor
  posts: WordPressPost[]
  pageInfo?: {
    endCursor: string | null
    hasNextPage: boolean
  }
}

const coerceToNumber = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      return numeric
    }

    try {
      const decoded = Buffer.from(value, "base64").toString("ascii")
      const parts = decoded.split(":")
      const maybeNumber = Number(parts[parts.length - 1])
      if (!Number.isNaN(maybeNumber)) {
        return maybeNumber
      }
    } catch {
      // Ignore decoding errors
    }
  }
  return 0
}

const selectAvatarUrl = (avatar: any): { url?: string } | undefined => {
  if (!avatar) return undefined
  if (typeof avatar === "object" && "url" in avatar) {
    const url = (avatar as { url?: string }).url
    return url ? { url } : undefined
  }
  if (typeof avatar === "object" && "96" in avatar) {
    const urls = avatar as Record<string, string>
    return {
      url: urls["96"] || urls["48"] || urls["24"],
    }
  }
  return undefined
}

export async function getAuthorBySlug(
  slug: string,
  { countryCode = DEFAULT_COUNTRY, postLimit = 12 }: { countryCode?: string; postLimit?: number } = {},
): Promise<AuthorLookupResult | null> {
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "authors",
    extra: [`author:${slug}`],
  })

  const gqlAuthor = await fetchAuthorData(slug, null, countryCode, postLimit)
  if (gqlAuthor) {
    return {
      author: {
        id: coerceToNumber(gqlAuthor.databaseId ?? gqlAuthor.id),
        name: gqlAuthor.name,
        slug: gqlAuthor.slug,
        description: gqlAuthor.description ?? undefined,
        avatar: selectAvatarUrl(gqlAuthor.avatar),
      },
      posts: gqlAuthor.posts.nodes ?? [],
      pageInfo: gqlAuthor.posts.pageInfo,
    }
  }

  const restAuthors = await executeRestFallback(
    () =>
      fetchFromWp<any[]>(
        countryCode,
        {
          endpoint: "users",
          params: { slug },
        },
        { tags: cacheTags },
      ),
    `[v0] Author REST fallback failed for ${slug} (${countryCode})`,
    { countryCode, slug },
    { fallbackValue: [] },
  )

  const restAuthor = restAuthors[0]
  if (!restAuthor) {
    return null
  }

  const query = wordpressQueries.posts({
    page: 1,
    perPage: postLimit,
    author: String(restAuthor.id),
  })
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, query, { tags: cacheTags }),
    `[v0] Author posts REST fallback failed for ${slug} (${countryCode})`,
    {
      countryCode,
      slug,
      authorId: restAuthor.id,
      postLimit,
      endpoint: query.endpoint,
      params: query.params,
    },
    { fallbackValue: [] },
  )

  return {
    author: {
      id: restAuthor.id,
      name: restAuthor.name,
      slug: restAuthor.slug,
      description: restAuthor.description || undefined,
      avatar: selectAvatarUrl(restAuthor.avatar_urls),
    },
    posts,
  }
}

export async function fetchCategoryPosts(slug: string, cursor: string | null = null, countryCode = DEFAULT_COUNTRY) {
  const tags = buildCacheTags({
    country: countryCode,
    section: "categories",
    extra: [`category:${slug}`],
  })

  const data = await fetchFromWpGraphQL<CategoryPostsQuery>(
    countryCode,
    CATEGORY_POSTS_QUERY,
    {
      slug,
      after: cursor,
      first: 10,
    },
    tags,
  )
  if (!data?.posts || !data?.categories) return null
  const catNode = data.categories.nodes?.[0] ?? null
  const category = catNode
    ? {
        id: catNode.databaseId ?? 0,
        name: catNode.name ?? "",
        slug: catNode.slug ?? slug,
        description: catNode.description ?? undefined,
        count: catNode.count ?? undefined,
      }
    : null
  const nodes = data.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
  return {
    category,
    posts: nodes.map((p) => mapWpPost(p, "gql", countryCode)),
    pageInfo: {
      ...data.posts.pageInfo,
      endCursor: data.posts.pageInfo.endCursor ?? null,
    },
  }
}

export const fetchAllCategories = (countryCode = DEFAULT_COUNTRY) => getCategoriesForCountry(countryCode)

export async function fetchPendingComments(countryCode = DEFAULT_COUNTRY): Promise<WordPressComment[]> {
  const tags = buildCacheTags({ country: countryCode, section: "comments" })
  const comments = await fetchFromWp<WordPressComment[]>(
    countryCode,
    {
      endpoint: "comments",
      params: { status: "hold", per_page: 100, _embed: 1 },
    },
    { tags },
  )
  return comments || []
}

export async function approveComment(commentId: number, countryCode = DEFAULT_COUNTRY) {
  try {
    const res = await fetchFromWp<WordPressComment>(countryCode, {
      endpoint: `comments/${commentId}`,
      method: "POST",
      payload: { status: "approve" },
    })
    if (!res) throw new Error(`Failed to approve comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to approve comment ${commentId}`, { error })
    throw error
  }
}

export async function deleteComment(commentId: number, countryCode = DEFAULT_COUNTRY) {
  try {
    const res = await fetchFromWp<WordPressComment>(countryCode, {
      endpoint: `comments/${commentId}`,
      method: "DELETE",
    })
    if (!res) throw new Error(`Failed to delete comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to delete comment ${commentId}`, { error })
    throw error
  }
}

export async function updateUserProfile() {
  return null
}
