import { getGraphQLEndpoint, getRestBase } from "@/lib/wp-endpoints"
import { wordpressQueries } from "./wordpress-queries"
import * as log from "./log"
import { fetchWithTimeout } from "./utils/fetchWithTimeout"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapWpPost } from "./utils/mapWpPost"
import { APIError } from "./utils/errorHandling"
import type { HomePost } from "@/types/home"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "./editions"
import { buildCacheTags } from "@/lib/cache/tag-utils"

const gql = String.raw

let circuitBreakerInstance: any = null
async function getCircuitBreaker() {
  if (!circuitBreakerInstance) {
    const { circuitBreaker } = await import("./api/circuit-breaker")
    circuitBreakerInstance = circuitBreaker
  }
  return circuitBreakerInstance
}

const mapPostFromWp = (post: WordPressPost, countryCode?: string): WordPressPost => mapWpPost(post, "rest", countryCode)

const mapWordPressPostToHomePost = (post: WordPressPost, countryCode: string): HomePost => ({
  id: String(post.id ?? post.slug ?? ""),
  slug: post.slug ?? "",
  title: post.title?.rendered ?? "",
  excerpt: post.excerpt?.rendered ?? "",
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

const mapGraphqlNodeToHomePost = (post: WordPressPost, countryCode: string): HomePost => {
  const mapped = mapWpPost(post, "gql", countryCode)
  return mapWordPressPostToHomePost(mapped, countryCode)
}

export const mapPostsToHomePosts = (posts: WordPressPost[] | null | undefined, countryCode: string): HomePost[] => {
  if (!posts || posts.length === 0) {
    return []
  }
  return posts.map((post) => mapWordPressPostToHomePost(post, countryCode))
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

async function executeRestFallback<T>(
  operation: () => Promise<T | null | undefined>,
  message: string,
  context: RestFallbackContext,
): Promise<T> {
  try {
    const result = await operation()
    if (result === null || result === undefined) {
      throw new Error("REST fallback returned no data")
    }
    return result
  } catch (error) {
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

export interface WordPressPost {
  id: number
  date: string
  slug: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content?: { rendered: string }
  _embedded?: {
    "wp:term"?: Array<Array<{ id: number; name: string; slug: string }>>
    [key: string]: unknown
  }
  categories?: { nodes: WordPressCategory[] }
  tags?: { nodes: WordPressTag[] }
  author?: { node: WordPressAuthor }
  featuredImage?: { node: WordPressImage }
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
  type?: "country"
}

export const COUNTRIES: Record<string, CountryConfig> = {
  sz: {
    code: "sz",
    name: "Eswatini",
    flag: "🇸🇿",
    apiEndpoint: getGraphQLEndpoint("sz"),
    restEndpoint: getRestBase("sz"),
  },
  za: {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    apiEndpoint: getGraphQLEndpoint("za"),
    restEndpoint: getRestBase("za"),
  },
}


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

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  tags?: string[],
): Promise<T | null> {
  const base = getGraphQLEndpoint(countryCode)

  try {
    console.log("[v0] GraphQL request to:", base)

    const res = await fetchWithTimeout(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      next: {
        revalidate: CACHE_DURATIONS.MEDIUM,
        ...(tags && tags.length > 0 ? { tags } : {}),
      },
      timeout: 10000,
    })

    if (!res.ok) {
      console.error("[v0] GraphQL request failed:", res.status, res.statusText)
      log.error(`WordPress GraphQL request failed for ${base}`, { status: res.status })
      return null
    }

    const json = (await res.json()) as WordPressGraphQLResponse<T>

    if (json.errors && json.errors.length > 0) {
      console.error("[v0] GraphQL errors:", json.errors)
      log.error(`WordPress GraphQL errors for ${base}`, { errors: json.errors })
      return null
    }

    console.log("[v0] GraphQL request successful")
    return (json.data ?? null) as T | null
  } catch (error) {
    console.error("[v0] GraphQL request exception:", error)
    log.error(`WordPress GraphQL request failed for ${base}`, { error })
    return null
  }
}

const POST_FIELDS = gql`
  fragment PostFields on Post {
    databaseId
    id
    slug
    date
    title
    excerpt
    content
    featuredImage {
      node {
        sourceUrl
        altText
        mediaDetails {
          width
          height
        }
      }
    }
    categories {
      nodes {
        databaseId
        name
        slug
      }
    }
    tags {
      nodes {
        databaseId
        name
        slug
      }
    }
    author {
      node {
        databaseId
        name
        slug
      }
    }
  }
`

const HOME_POST_FIELDS = gql`
  fragment HomePostFields on Post {
    databaseId
    slug
    date
    title
    excerpt
    featuredImage {
      node {
        sourceUrl
        altText
      }
    }
  }
`

const LATEST_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query LatestPosts($first: Int!, $after: String) {
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

const FP_TAGGED_POSTS_QUERY = gql`
  ${HOME_POST_FIELDS}
  query FpTaggedPosts($tagSlugs: [String!]!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: $tagSlugs
      }
    ) {
      nodes {
        ...HomePostFields
      }
    }
  }
`

const POSTS_BY_CATEGORY_QUERY = gql`
  ${POST_FIELDS}
  query PostsByCategory($category: String!, $first: Int!) {
    categories(where: { slug: [$category] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $category
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

const CATEGORY_POSTS_BATCH_QUERY = gql`
  ${POST_FIELDS}
  query CategoryPostsBatch($slugs: [String!]!, $first: Int!) {
    categories(where: { slugIn: $slugs }) {
      nodes {
        databaseId
        name
        slug
        description
        count
        posts(
          first: $first
          where: {
            status: PUBLISH
            orderby: { field: DATE, order: DESC }
          }
        ) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            ...PostFields
          }
        }
      }
    }
  }
`

const CATEGORIES_QUERY = gql`
  query AllCategories($first: Int = 100) {
    categories(first: $first, where: { hideEmpty: true }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
  }
`

const POST_CATEGORIES_QUERY = gql`
  ${POST_FIELDS}
  query PostCategories($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      categories {
        nodes {
          databaseId
        }
      }
    }
  }
`

const RELATED_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query RelatedPosts(
    $catIds: [ID!]
    $exclude: ID!
    $first: Int!
  ) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        notIn: [$exclude]
        categoryIn: $catIds
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

const FEATURED_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query FeaturedPosts($tag: String!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: [$tag]
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

const AUTHOR_DATA_QUERY = gql`
  ${POST_FIELDS}
  query AuthorData($slug: String!, $after: String, $first: Int!) {
    user(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      avatar {
        url
      }
      posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          ...PostFields
        }
      }
    }
  }
`

const CATEGORY_POSTS_QUERY = gql`
  ${POST_FIELDS}
  query CategoryPosts($slug: String!, $after: String, $first: Int!) {
    categories(where: { slug: [$slug] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $slug
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

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
      : opts ?? {}

  const { timeout = 10000, withHeaders = false, tags } = normalizedOpts

  const { method = "GET", payload, params: queryParams = {}, endpoint } = query

  const base = getRestBase(countryCode)
  const params = new URLSearchParams(
    Object.entries(queryParams)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString()
  const url = `${base}/${endpoint}${params ? `?${params}` : ""}`

  try {
    console.log("[v0] REST request to:", url)

    const res = await fetchWithTimeout(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      next: {
        revalidate: CACHE_DURATIONS.MEDIUM,
        ...(tags && tags.length > 0 ? { tags } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      timeout,
    })

    if (!res.ok) {
      console.error("[v0] REST request failed:", res.status, res.statusText)
      log.error(`WordPress API error ${res.status} for ${url}`)
      return null
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
    console.error("[v0] REST request exception:", error)
    log.error(`WordPress API request failed for ${url}`, { error })
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

export async function getFpTaggedPostsForCountry(countryCode: string, limit = 8): Promise<HomePost[]> {
  const tags = buildCacheTags({ country: countryCode, section: "frontpage", extra: ["tag:fp"] })

  interface FpTaggedPostsData {
    posts: {
      nodes: WordPressPost[]
    }
  }

  try {
    console.log("[v0] Fetching FP tagged posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<FpTaggedPostsData>(
      countryCode,
      FP_TAGGED_POSTS_QUERY,
      {
        tagSlugs: ["fp"],
        first: limit,
      },
      tags,
    )

    if (gqlData?.posts?.nodes?.length) {
      console.log("[v0] Found", gqlData.posts.nodes.length, "FP tagged posts via GraphQL")
      return gqlData.posts.nodes.map((node) => mapGraphqlNodeToHomePost(node, countryCode))
    }

    console.log("[v0] No GraphQL results, trying REST fallback")

    const tags = await executeRestFallback(
      () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug("fp"), { tags }),
      `[v0] FP tag lookup REST fallback failed for ${countryCode}`,
      { countryCode },
    )

    const tag = tags[0]
    if (!tag) {
      console.log("[v0] No FP tag found")
      return []
    }

    const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
      `[v0] FP tagged posts REST fallback failed for ${countryCode}`,
      { countryCode, tagId: tag.id, limit, endpoint, params },
    )

    const normalizedPosts = Array.isArray(posts)
      ? posts.map((post) => mapWordPressPostToHomePost(mapPostFromWp(post, countryCode), countryCode))
      : []

    console.log("[v0] Found", normalizedPosts.length, "FP tagged posts via REST")
    return normalizedPosts
  } catch (error) {
    console.error("[v0] Failed to fetch FP tagged posts:", error)
    return []
  }
}

export async function getLatestPostsForCountry(countryCode: string, limit = 20, cursor?: string | null) {
  const tags = buildCacheTags({ country: countryCode, section: "news" })

  interface LatestPostsData {
    posts: {
      nodes: WordPressPost[]
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }

  try {
    console.log("[v0] Fetching latest posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<LatestPostsData>(
      countryCode,
      LATEST_POSTS_QUERY,
      {
        first: limit,
        ...(cursor ? { after: cursor } : {}),
      },
      tags,
    )

    if (gqlData?.posts) {
      const posts = gqlData.posts.nodes.map((p) => mapWpPost(p, "gql", countryCode))
      console.log("[v0] Found", posts.length, "latest posts via GraphQL")
      return {
        posts,
        hasNextPage: gqlData.posts.pageInfo.hasNextPage,
        endCursor: gqlData.posts.pageInfo.endCursor,
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

  interface CategoryPostsBatchData {
    categories: {
      nodes: Array<{
        databaseId: number
        name: string
        slug: string
        description?: string
        count?: number
        posts?: {
          nodes: WordPressPost[]
          pageInfo: {
            hasNextPage: boolean
            endCursor: string | null
          }
        }
      }>
    }
  }

  const gqlData = await fetchFromWpGraphQL<CategoryPostsBatchData>(
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
        id: node.databaseId,
        name: node.name,
        slug: node.slug,
        description: node.description ?? undefined,
        count: node.count ?? undefined,
      }

      const posts = (node.posts?.nodes ?? []).map((post) => mapWpPost(post, "gql", countryCode))

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
    const categories = await fetchFromWp<any[]>(
      countryCode,
      wordpressQueries.categoriesBySlugs(normalizedSlugs),
      { tags },
    )

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

  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    POSTS_BY_CATEGORY_QUERY,
    {
      category: categorySlug,
      first: limit,
    },
    tags,
  )
  if (gqlData?.posts && gqlData?.categories) {
    const catNode = gqlData.categories.nodes[0]
    const category = catNode
      ? {
          id: catNode.databaseId,
          name: catNode.name,
          slug: catNode.slug,
          description: catNode.description ?? undefined,
          count: catNode.count ?? undefined,
        }
      : null
    const posts = gqlData.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode))
    return {
      category,
      posts,
      hasNextPage: gqlData.posts.pageInfo.hasNextPage,
      endCursor: gqlData.posts.pageInfo.endCursor,
    }
  }
  const categories = await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, wordpressQueries.categoryBySlug(categorySlug), { tags }),
    `[v0] Category REST fallback failed for ${categorySlug} (${countryCode})`,
    { countryCode, categorySlug },
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
  )
  return { category, posts, hasNextPage: false, endCursor: null }
}

export async function getCategoriesForCountry(countryCode: string) {
  const tags = buildCacheTags({ country: countryCode, section: "categories" })

  const gqlData = await fetchFromWpGraphQL<any>(countryCode, CATEGORIES_QUERY, undefined, tags)
  if (gqlData?.categories) {
    return gqlData.categories.nodes.map((c: any) => ({
      id: c.databaseId,
      name: c.name,
      slug: c.slug,
      description: c.description ?? undefined,
      count: c.count ?? undefined,
    })) as WordPressCategory[]
  }
  const { endpoint, params } = wordpressQueries.categories()
  return await executeRestFallback(
    () => fetchFromWp<WordPressCategory[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Categories REST fallback failed for ${countryCode}`,
    { countryCode, endpoint, params },
  )
}

export async function getRelatedPostsForCountry(countryCode: string, postId: string, limit = 6) {
  const tags = buildCacheTags({ country: countryCode, section: "related", extra: [`post:${postId}`] })

  const gqlPost = await fetchFromWpGraphQL<any>(
    countryCode,
    POST_CATEGORIES_QUERY,
    { id: Number(postId) },
    tags,
  )
  if (gqlPost?.post) {
    const catIds = gqlPost.post.categories.nodes.map((c: any) => c.databaseId)
    if (catIds.length > 0) {
      const gqlData = await fetchFromWpGraphQL<any>(
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
        const posts = gqlData.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode))
        return posts.filter((p) => p.id !== Number(postId))
      }
    }
  }
  const post = await executeRestFallback(
    () => fetchFromWp<WordPressPost>(countryCode, wordpressQueries.postById(postId), { tags }),
    `[v0] Related posts REST fallback failed for base post ${postId} (${countryCode})`,
    { countryCode, postId },
  )
  const categoryIds: number[] = post._embedded?.["wp:term"]?.[0]?.map((cat: any) => cat.id) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Related posts REST fallback failed for ${postId} (${countryCode})`,
    { countryCode, postId, categoryIds, limit, endpoint, params },
  )
  return posts.filter((p) => p.id !== Number(postId))
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const cacheTags = buildCacheTags({ country: countryCode, section: "featured", extra: ["tag:featured"] })

  const gqlData = await fetchFromWpGraphQL<any>(
    countryCode,
    FEATURED_POSTS_QUERY,
    {
      tag: "featured",
      first: limit,
    },
    cacheTags,
  )
  if (gqlData?.posts) {
    return gqlData.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode))
  }
  const tags = await executeRestFallback(
    () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug("featured"), { tags: cacheTags }),
    `[v0] Featured tag REST fallback failed for ${countryCode}`,
    { countryCode },
  )
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags }),
    `[v0] Featured posts REST fallback failed for ${countryCode}`,
    { countryCode, tagId: tag.id, limit, endpoint, params },
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
      SUPPORTED_COUNTRY_EDITIONS.map(async (country) => {
        const { posts } = await getLatestPostsForCountry(country.code, limitPerCountry)
        return mapPostsToHomePosts(posts, country.code)
      }),
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
      const key = `${post.country ?? ""}:${post.slug}`
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
    return value
  }
  if (value && typeof value === "object" && "rendered" in value && typeof (value as any).rendered === "string") {
    return (value as any).rendered
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
  const { posts } = await getLatestPostsForCountry(countryCode, limit)
  return posts
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
  return (
    await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags })
  ) || []
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
    return (
      await fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params }, { tags })
    ) || []
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

export const fetchCategories = (countryCode = DEFAULT_COUNTRY) => getCategoriesForCountry(countryCode)

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  const tags = buildCacheTags({ country: countryCode, section: "tags" })
  return (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params }, { tags })) || []
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

  const data = await fetchFromWpGraphQL<any>(
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
  return {
    ...data.user,
    posts: {
      nodes: data.user.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode)),
      pageInfo: data.user.posts.pageInfo,
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

  const data = await fetchFromWpGraphQL<any>(
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
  const catNode = data.categories.nodes[0]
  const category = catNode
    ? {
        id: catNode.databaseId,
        name: catNode.name,
        slug: catNode.slug,
        description: catNode.description ?? undefined,
        count: catNode.count ?? undefined,
      }
    : null
  return {
    category,
    posts: data.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode)),
    pageInfo: data.posts.pageInfo,
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
