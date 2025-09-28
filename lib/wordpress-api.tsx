import { getWpEndpoints } from "@/config/wp"
import { circuitBreaker } from "./api/circuit-breaker"
import * as log from "./log"
import { fetchWithTimeout } from "./utils/fetchWithTimeout"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapWpPost } from "./utils/mapWpPost"
import type { HomePost } from "@/types/home"
import { fetchWithErrorHandling } from "./utils/fetchWithErrorHandling"
import { retryWithBackoff, isNetworkError } from "../utils/network-utils"

// Simple gql tag replacement
const gql = String.raw

const mapPostFromWp = (post: any, countryCode?: string) => mapWpPost(post, "rest", countryCode)

const mapWordPressPostToHomePost = (post: any, countryCode: string): HomePost => ({
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

const mapGraphqlNodeToHomePost = (post: any, countryCode: string): HomePost => {
  const mapped = mapWpPost(post, "gql", countryCode)
  return mapWordPressPostToHomePost(mapped, countryCode)
}

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }

  return { error }
}

async function executeRestFallback<T>(
  countryCode: string,
  endpoint: string,
  params: Record<string, any> = {},
  operation: string,
  fallbackData?: T[],
): Promise<T[]> {
  const endpoints = getWpEndpoints(countryCode)
  const baseUrl = endpoints.rest

  if (!endpoint || typeof endpoint !== "string") {
    throw new Error("Invalid REST endpoint provided")
  }

  if (!baseUrl || !baseUrl.startsWith("http")) {
    throw new Error("Invalid REST API base URL")
  }

  const sanitizedParams = sanitizeRestParams(params)
  const queryString = new URLSearchParams(sanitizedParams).toString()
  const url = `${baseUrl}/${endpoint.replace(/^\//, "")}${queryString ? `?${queryString}` : ""}`

  console.log(`[v0] Attempting API operation: ${operation}`)

  try {
    return await retryWithBackoff(
      async () => {
        console.log(`[v0] REST API request to ${url}`)

        const response = await fetchWithErrorHandling<T[]>(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "NewsOnAfrica/1.0",
            ...(process.env.WORDPRESS_AUTH_TOKEN && {
              Authorization: `Bearer ${process.env.WORDPRESS_AUTH_TOKEN}`,
            }),
            ...(process.env.WP_APP_USERNAME &&
              process.env.WP_APP_PASSWORD && {
                Authorization: `Basic ${Buffer.from(`${process.env.WP_APP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64")}`,
              }),
          },
          timeout: 15000,
          retries: 2,
          retryDelay: 1000,
        })

        if (!response.success || !response.data) {
          throw new Error(response.error || `REST API request failed: ${response.status} ${response.statusText}`)
        }

        if (!Array.isArray(response.data)) {
          log.warn(`[v0] REST API response is not an array for ${url}`, { response: response.data })
          return []
        }

        console.log(`[v0] API operation successful: ${operation}`)
        return response.data
      },
      3,
      2000,
    )
  } catch (error) {
    log.error(`[v0] ${operation}`, {
      countryCode,
      endpoint,
      params: sanitizedParams,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        name: error instanceof Error ? error.name : "Error",
        stack: error instanceof Error ? error.stack : undefined,
        isNetworkError: isNetworkError(error),
      },
    })

    console.log(`[v0] API operation failed: ${operation}`, error instanceof Error ? error.message : "Unknown error")

    if (fallbackData && Array.isArray(fallbackData)) {
      console.log(`[v0] Using provided fallback data for: ${operation}`)
      return fallbackData
    }

    throw new Error(`API operation failed: ${operation}`)
  }
}

function sanitizeRestParams(params: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue
    }

    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, "")

    if (typeof value === "string") {
      sanitized[sanitizedKey] = value.trim().substring(0, 500)
    } else if (typeof value === "number") {
      sanitized[sanitizedKey] = Math.max(0, Math.min(value, 10000)).toString()
    } else if (typeof value === "boolean") {
      sanitized[sanitizedKey] = value.toString()
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.slice(0, 50).join(",")
    } else {
      sanitized[sanitizedKey] = String(value).substring(0, 500)
    }
  }

  return sanitized
}

export const mapPostsToHomePosts = (posts: any[] | null | undefined, countryCode: string): HomePost[] => {
  if (!posts || posts.length === 0) {
    return []
  }
  return posts.map((post) => mapWordPressPostToHomePost(post, countryCode))
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
  _embedded?: any
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
}

export const COUNTRIES: Record<string, CountryConfig> = {
  sz: {
    code: "sz",
    name: "Eswatini",
    flag: "🇸🇿",
    apiEndpoint: getWpEndpoints("sz").graphql,
    restEndpoint: getWpEndpoints("sz").rest,
  },
  za: {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    apiEndpoint: getWpEndpoints("za").graphql,
    restEndpoint: getWpEndpoints("za").rest,
  },
  ng: {
    code: "ng",
    name: "Nigeria",
    flag: "🇳🇬",
    apiEndpoint: getWpEndpoints("ng").graphql,
    restEndpoint: getWpEndpoints("ng").rest,
  },
  ke: {
    code: "ke",
    name: "Kenya",
    flag: "🇰🇪",
    apiEndpoint: getWpEndpoints("ke").graphql,
    restEndpoint: getWpEndpoints("ke").rest,
  },
  gh: {
    code: "gh",
    name: "Ghana",
    flag: "🇬🇭",
    apiEndpoint: getWpEndpoints("gh").graphql,
    restEndpoint: getWpEndpoints("gh").rest,
  },
  et: {
    code: "et",
    name: "Ethiopia",
    flag: "🇪🇹",
    apiEndpoint: getWpEndpoints("et").graphql,
    restEndpoint: getWpEndpoints("et").rest,
  },
  eg: {
    code: "eg",
    name: "Egypt",
    flag: "🇪🇬",
    apiEndpoint: getWpEndpoints("eg").graphql,
    restEndpoint: getWpEndpoints("eg").rest,
  },
  ma: {
    code: "ma",
    name: "Morocco",
    flag: "🇲🇦",
    apiEndpoint: getWpEndpoints("ma").graphql,
    restEndpoint: getWpEndpoints("ma").rest,
  },
  tz: {
    code: "tz",
    name: "Tanzania",
    flag: "🇹🇿",
    apiEndpoint: getWpEndpoints("tz").graphql,
    restEndpoint: getWpEndpoints("tz").rest,
  },
  ug: {
    code: "ug",
    name: "Uganda",
    flag: "🇺🇬",
    apiEndpoint: getWpEndpoints("ug").graphql,
    restEndpoint: getWpEndpoints("ug").rest,
  },
  rw: {
    code: "rw",
    name: "Rwanda",
    flag: "🇷🇼",
    apiEndpoint: getWpEndpoints("rw").graphql,
    restEndpoint: getWpEndpoints("rw").rest,
  },
  sn: {
    code: "sn",
    name: "Senegal",
    flag: "🇸🇳",
    apiEndpoint: getWpEndpoints("sn").graphql,
    restEndpoint: getWpEndpoints("sn").rest,
  },
  ci: {
    code: "ci",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    apiEndpoint: getWpEndpoints("ci").graphql,
    restEndpoint: getWpEndpoints("ci").rest,
  },
  cm: {
    code: "cm",
    name: "Cameroon",
    flag: "🇨🇲",
    apiEndpoint: getWpEndpoints("cm").graphql,
    restEndpoint: getWpEndpoints("cm").rest,
  },
  ao: {
    code: "ao",
    name: "Angola",
    flag: "🇦🇴",
    apiEndpoint: getWpEndpoints("ao").graphql,
    restEndpoint: getWpEndpoints("ao").rest,
  },
  mz: {
    code: "mz",
    name: "Mozambique",
    flag: "🇲🇿",
    apiEndpoint: getWpEndpoints("mz").graphql,
    restEndpoint: getWpEndpoints("mz").rest,
  },
  zw: {
    code: "zw",
    name: "Zimbabwe",
    flag: "🇿🇼",
    apiEndpoint: getWpEndpoints("zw").graphql,
    restEndpoint: getWpEndpoints("zw").rest,
  },
  bw: {
    code: "bw",
    name: "Botswana",
    flag: "🇧🇼",
    apiEndpoint: getWpEndpoints("bw").graphql,
    restEndpoint: getWpEndpoints("bw").rest,
  },
  zm: {
    code: "zm",
    name: "Zambia",
    flag: "🇿🇲",
    apiEndpoint: getWpEndpoints("zm").graphql,
    restEndpoint: getWpEndpoints("zm").rest,
  },
  mw: {
    code: "mw",
    name: "Malawi",
    flag: "🇲🇼",
    apiEndpoint: getWpEndpoints("mw").graphql,
    restEndpoint: getWpEndpoints("mw").rest,
  },
  na: {
    code: "na",
    name: "Namibia",
    flag: "🇳🇦",
    apiEndpoint: getWpEndpoints("na").graphql,
    restEndpoint: getWpEndpoints("na").rest,
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
  errors?: Array<Record<string, unknown>>
}

async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables: Record<string, any> = {},
): Promise<T | null> {
  const endpoints = getWpEndpoints(countryCode)
  const url = endpoints.graphql

  console.log(`[v0] GraphQL endpoint: ${url}`)

  const operation = `GraphQL query for ${countryCode}`

  try {
    return await retryWithBackoff(
      async () => {
        if (!query || typeof query !== "string") {
          throw new Error("Invalid GraphQL query provided")
        }

        if (!url || !url.startsWith("http")) {
          throw new Error("Invalid GraphQL endpoint URL")
        }

        const sanitizedVariables = sanitizeGraphQLVariables(variables)

        const requestBody = {
          query: query.trim(),
          variables: sanitizedVariables,
        }

        console.log(`[v0] GraphQL request to ${url}:`, {
          query: query.substring(0, 100) + "...",
          variables: sanitizedVariables,
        })

        const response = await fetchWithErrorHandling<WordPressGraphQLResponse<T>>(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "NewsOnAfrica/1.0",
            ...(process.env.WORDPRESS_AUTH_TOKEN && {
              Authorization: `Bearer ${process.env.WORDPRESS_AUTH_TOKEN}`,
            }),
          },
          body: JSON.stringify(requestBody),
          timeout: 15000,
          retries: 2,
          retryDelay: 1000,
        })

        if (!response.success || !response.data) {
          if (response.error?.includes("404")) {
            throw new Error(
              `GraphQL endpoint not found (404). The WordPress site may not have GraphQL enabled or the endpoint URL is incorrect.`,
            )
          } else if (response.error?.includes("500")) {
            throw new Error(
              `GraphQL server error (500). There may be an issue with the WordPress GraphQL configuration.`,
            )
          } else {
            throw new Error(response.error || `GraphQL request failed`)
          }
        }

        const data = response.data

        if (data.errors && data.errors.length > 0) {
          const errorMessages = data.errors
            .map((err) =>
              typeof err === "object" && err !== null && "message" in err ? String(err.message) : String(err),
            )
            .join("; ")
          console.error(`[v0] GraphQL errors for ${url}:`, data.errors)
          throw new Error(`GraphQL query errors: ${errorMessages}`)
        }

        if (!data.data) {
          console.error(`[v0] GraphQL response missing data field for ${url}:`, data)
          throw new Error("GraphQL response missing data field")
        }

        console.log(`[v0] GraphQL request successful for ${url}`)
        return data.data
      },
      3,
      2000,
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[v0] WordPress GraphQL request failed for ${url}`, {
      error: errorMessage,
      isNetworkError: isNetworkError(error),
    })

    return null
  }
}

function sanitizeGraphQLVariables(variables: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(variables)) {
    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === "string") {
      sanitized[key] = value.trim().substring(0, 1000)
    } else if (typeof value === "number") {
      sanitized[key] = Math.max(0, Math.min(value, 10000))
    } else if (Array.isArray(value)) {
      sanitized[key] = value
        .slice(0, 100)
        .map((item) => (typeof item === "string" ? item.trim().substring(0, 200) : item))
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
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
  ${HOME_POST_FIELDS}
  query CategoryPostsBatch($categories: [String!]!, $postsPerCategory: Int!) {
    categories(where: { slug: $categories }) {
      nodes {
        databaseId
        name
        slug
        description
        count
        posts(first: $postsPerCategory, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
          nodes {
            ...HomePostFields
          }
        }
      }
    }
  }
`

const FEATURED_POSTS_QUERY = gql`
  ${HOME_POST_FIELDS}
  query FeaturedPosts($first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        metaQuery: {
          relation: OR
          metaArray: [
            { key: "featured", value: "1", compare: EQUAL_TO }
            { key: "_featured", value: "1", compare: EQUAL_TO }
            { key: "is_featured", value: "true", compare: EQUAL_TO }
          ]
        }
      }
    ) {
      nodes {
        ...HomePostFields
      }
    }
  }
`

const CATEGORIES_QUERY = gql`
  query Categories {
    categories(where: { hideEmpty: true }) {
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
  query PostCategories($id: Int!) {
    post(id: $id, idType: DATABASE_ID) {
      categories {
        nodes {
          databaseId
          name
          slug
        }
      }
    }
  }
`

const RELATED_POSTS_QUERY = gql`
  ${HOME_POST_FIELDS}
  query RelatedPosts($categoryIds: [Int!]!, $excludeId: Int!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryIn: $categoryIds
        notIn: [$excludeId]
      }
    ) {
      nodes {
        ...HomePostFields
      }
    }
  }
`

const AUTHOR_DATA_QUERY = gql`
  ${POST_FIELDS}
  query AuthorData($slug: String!, $first: Int!) {
    user(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      avatar {
        url
      }
      posts(first: $first, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
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
  query CategoryPosts($slug: String!, $first: Int!, $after: String) {
    category(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      count
      posts(
        first: $first
        after: $after
        where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }
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
`

export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  timeout?: number,
): Promise<T | null>
export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders: true },
): Promise<{ data: T; headers: Headers } | null>
export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, any>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders?: boolean } = {},
): Promise<any> {
  const { timeout = 10000, withHeaders = false } =
    typeof opts === "number" ? { timeout: opts, withHeaders: false } : opts

  const { method = "GET", payload, params: queryParams = {}, endpoint } = query

  const base = getWpEndpoints(countryCode).rest
  const params = new URLSearchParams(Object.entries(queryParams).map(([k, v]) => [k, String(v)])).toString()
  const url = `${base}/${endpoint}${params ? `?${params}` : ""}`

  const operation = async (): Promise<T | null> => {
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        next: { revalidate: CACHE_DURATIONS.MEDIUM },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        timeout,
      })
      if (!res.ok) {
        log.error(`[v0] WordPress API error ${res.status} for ${url}`)
        return null
      }
      const rawData = await res.json()
      let data: any
      if (query.endpoint.startsWith("posts")) {
        if (Array.isArray(rawData)) {
          data = rawData.map((p: any) => mapPostFromWp(p, countryCode)) as T
        } else {
          data = mapPostFromWp(rawData, countryCode) as T
        }
      } else {
        data = rawData as T
      }

      if (withHeaders) {
        return { data: data as T, headers: res.headers }
      }
      return data as T
    } catch (error) {
      log.error(`[v0] WordPress API request failed for ${url}`, { error })
      throw error
    }
  }

  try {
    return await circuitBreaker.execute<T | null>(url, operation, async () => null)
  } catch (error) {
    log.error(`[v0] Circuit breaker error for ${url}`, { error })
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

export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 10,
  cursor?: string | null,
): Promise<{ posts: WordPressPost[]; hasNextPage: boolean; endCursor: string | null }> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, LATEST_POSTS_QUERY, {
      first: limit,
      after: cursor,
    })

    if (gqlData?.posts?.nodes) {
      return {
        posts: gqlData.posts.nodes,
        hasNextPage: gqlData.posts.pageInfo?.hasNextPage ?? false,
        endCursor: gqlData.posts.pageInfo?.endCursor ?? null,
      }
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for latest posts, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  const offset = cursorToOffset(cursor)
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    "posts",
    {
      per_page: limit,
      _embed: 1,
      order: "desc",
      orderby: "date",
      ...(offset && { offset }),
    },
    `Latest posts REST fallback for ${countryCode}`,
  )

  return {
    posts,
    hasNextPage: posts.length === limit,
    endCursor: posts.length > 0 ? Buffer.from(`post:${posts[posts.length - 1].id}`).toString("base64") : null,
  }
}

export async function getFpTaggedPosts(countryCode: string, limit = 8): Promise<WordPressPost[]> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, FP_TAGGED_POSTS_QUERY, {
      tagSlugs: ["fp"],
      first: limit,
    })

    if (gqlData?.posts?.nodes && gqlData.posts.nodes.length > 0) {
      return gqlData.posts.nodes
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for FP tagged posts, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  try {
    const fpTag = await executeRestFallback<WordPressTag>(
      countryCode,
      "tags",
      { slug: "fp" },
      `FP tag lookup REST fallback for ${countryCode}`,
    )

    if (fpTag && fpTag.length > 0) {
      return executeRestFallback<WordPressPost>(
        countryCode,
        "posts",
        {
          tags: fpTag[0].id,
          per_page: limit,
          _embed: 1,
        },
        `FP tagged posts REST fallback for ${countryCode}`,
      )
    }
  } catch (error) {
    log.error(`[v0] Failed to fetch FP tagged posts for ${countryCode}`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  throw new Error(`Unable to fetch FP tagged posts for ${countryCode}`)
}

export const getFpTaggedPostsForCountry = getFpTaggedPosts

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

  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, CATEGORY_POSTS_BATCH_QUERY, {
      categories: normalizedSlugs,
      postsPerCategory: limit,
    })

    if (gqlData?.categories?.nodes?.length) {
      gqlData.categories.nodes.forEach((node: any) => {
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

        const posts = (node.posts?.nodes ?? []).map((post: any) => mapWpPost(post, "gql", countryCode))

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
  } catch (error) {
    log.warn(`[v0] GraphQL failed for category posts batch, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  // REST fallback for category posts
  for (const slug of normalizedSlugs) {
    try {
      const categoryData = await executeRestFallback<WordPressCategory>(
        countryCode,
        "categories",
        { slug },
        `Category lookup REST fallback for ${slug}`,
      )

      if (categoryData && categoryData.length > 0) {
        const category = categoryData[0]
        const posts = await executeRestFallback<WordPressPost>(
          countryCode,
          "posts",
          {
            categories: category.id,
            per_page: limit,
            _embed: 1,
          },
          `Category posts REST fallback for ${slug}`,
        )

        results[slug] = {
          category,
          posts,
          hasNextPage: posts.length === limit,
          endCursor: posts.length > 0 ? Buffer.from(`post:${posts[posts.length - 1].id}`).toString("base64") : null,
        }
      }
    } catch (error) {
      log.error(`[v0] Failed to fetch posts for category ${slug}`, {
        error,
        isNetworkError: isNetworkError(error),
      })
    }
  }

  normalizedSlugs.forEach((slug) => ensureEntry(results, slug))
  return results
}

export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, CATEGORIES_QUERY)

    if (gqlData?.categories?.nodes) {
      return gqlData.categories.nodes.map((node: any) => ({
        id: node.databaseId,
        name: node.name,
        slug: node.slug,
        description: node.description ?? undefined,
        count: node.count ?? undefined,
      }))
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for categories, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  return executeRestFallback<WordPressCategory>(
    countryCode,
    "categories",
    { per_page: 100, hide_empty: true },
    `Categories REST fallback for ${countryCode}`,
  )
}

export async function getPostsByCategory(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  cursor?: string | null,
): Promise<CategoryPostsResult> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, CATEGORY_POSTS_QUERY, {
      slug: categorySlug,
      first: limit,
      after: cursor,
    })

    if (gqlData?.category) {
      const category: WordPressCategory = {
        id: gqlData.category.databaseId,
        name: gqlData.category.name,
        slug: gqlData.category.slug,
        description: gqlData.category.description ?? undefined,
        count: gqlData.category.count ?? undefined,
      }

      return {
        category,
        posts: gqlData.category.posts?.nodes ?? [],
        hasNextPage: gqlData.category.posts?.pageInfo?.hasNextPage ?? false,
        endCursor: gqlData.category.posts?.pageInfo?.endCursor ?? null,
      }
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for category posts, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  // REST fallback
  const categoryData = await executeRestFallback<WordPressCategory>(
    countryCode,
    "categories",
    { slug: categorySlug },
    `Category lookup REST fallback for ${categorySlug}`,
  )

  if (!categoryData || categoryData.length === 0) {
    return {
      category: null,
      posts: [],
      hasNextPage: false,
      endCursor: null,
    }
  }

  const category = categoryData[0]
  const offset = cursorToOffset(cursor)
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    "posts",
    {
      categories: category.id,
      per_page: limit,
      _embed: 1,
      ...(offset && { offset }),
    },
    `Category posts REST fallback for ${categorySlug}`,
  )

  return {
    category,
    posts,
    hasNextPage: posts.length === limit,
    endCursor: posts.length > 0 ? Buffer.from(`post:${posts[posts.length - 1].id}`).toString("base64") : null,
  }
}

export async function getRelatedPosts(
  countryCode: string,
  postId: number,
  categoryIds: number[],
  limit = 6,
): Promise<WordPressPost[]> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, RELATED_POSTS_QUERY, {
      categoryIds,
      excludeId: postId,
      first: limit,
    })

    if (gqlData?.posts?.nodes) {
      return gqlData.posts.nodes
    }
  } catch (error) {
    console.error(`[v0] Failed to get related posts for country ${countryCode}, post ${postId}:`, error)
    return []
  }
}

export const getRelatedPostsForCountry = async (
  countryCode: string,
  postId: string,
  limit = 6,
): Promise<WordPressPost[]> => {
  try {
    const numericPostId = Number.parseInt(postId, 10)
    if (isNaN(numericPostId)) {
      console.warn(`[v0] Invalid post ID: ${postId}`)
      return []
    }

    // First get the post's categories
    const categoriesData = await fetchFromWpGraphQL<any>(countryCode, POST_CATEGORIES_QUERY, {
      id: numericPostId,
    })

    const categoryIds = categoriesData?.post?.categories?.nodes?.map((cat: any) => cat.databaseId) || []

    if (categoryIds.length === 0) {
      console.warn(`[v0] No categories found for post ${postId}`)
      return []
    }

    return await getRelatedPosts(countryCode, numericPostId, categoryIds, limit)
  } catch (error) {
    console.error(`[v0] Failed to get related posts for country ${countryCode}, post ${postId}:`, error)
    return []
  }
}

export const getBalancedCountryContent = async (countryCode: string, limit = 10): Promise<WordPressPost[]> => {
  try {
    // Get a balanced mix of latest posts and featured posts
    const [latestPosts, featuredPosts] = await Promise.allSettled([
      getLatestPostsForCountry(countryCode, Math.ceil(limit * 0.7)),
      getFpTaggedPosts(countryCode, Math.ceil(limit * 0.3)),
    ])

    const latest = latestPosts.status === "fulfilled" ? latestPosts.value.posts : []
    const featured = featuredPosts.status === "fulfilled" ? featuredPosts.value : []

    // Combine and deduplicate
    const combined = [...featured, ...latest]
    const unique = combined.filter((post, index, self) => index === self.findIndex((p) => p.id === post.id))

    return unique.slice(0, limit)
  } catch (error) {
    console.error(`[v0] Failed to get balanced country content for ${countryCode}:`, error)
    return []
  }
}

export const fetchPosts = async (countryCode: string, params: Record<string, any> = {}): Promise<WordPressPost[]> => {
  const { limit = 10, category, tag, author, search, ...restParams } = params

  try {
    return await executeRestFallback<WordPressPost>(
      countryCode,
      "posts",
      {
        per_page: limit,
        _embed: 1,
        ...(category && { categories: category }),
        ...(tag && { tags: tag }),
        ...(author && { author }),
        ...(search && { search }),
        ...restParams,
      },
      `Fetch posts for ${countryCode}`,
    )
  } catch (error) {
    console.error(`[v0] Failed to fetch posts for ${countryCode}:`, error)
    return []
  }
}

export const fetchPost = async (countryCode: string, slug: string): Promise<WordPressPost | null> => {
  try {
    const posts = await executeRestFallback<WordPressPost>(
      countryCode,
      "posts",
      {
        slug,
        _embed: 1,
      },
      `Fetch post ${slug} for ${countryCode}`,
    )

    return posts.length > 0 ? posts[0] : null
  } catch (error) {
    console.error(`[v0] Failed to fetch post ${slug} for ${countryCode}:`, error)
    return null
  }
}

export const getFeaturedPosts = async (countryCode: string, limit = 6): Promise<WordPressPost[]> => {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, FEATURED_POSTS_QUERY, {
      first: limit,
    })

    if (gqlData?.posts?.nodes && gqlData.posts.nodes.length > 0) {
      return gqlData.posts.nodes
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for featured posts, trying REST fallback`, {
      error,
      isNetworkError: isNetworkError(error),
    })
  }

  // REST fallback - try to find posts with featured meta
  try {
    return await executeRestFallback<WordPressPost>(
      countryCode,
      "posts",
      {
        per_page: limit,
        _embed: 1,
        meta_key: "featured",
        meta_value: "1",
      },
      `Featured posts REST fallback for ${countryCode}`,
    )
  } catch (error) {
    console.error(`[v0] Failed to fetch featured posts for ${countryCode}:`, error)
    return []
  }
}

export const resolveCountryTermId = async (countryCode: string): Promise<number | null> => {
  try {
    const categories = await getCategoriesForCountry(countryCode)
    const countryCategory = categories.find(
      (cat) =>
        cat.slug.toLowerCase() === countryCode.toLowerCase() ||
        cat.name.toLowerCase().includes(countryCode.toLowerCase()),
    )

    return countryCategory ? countryCategory.id : null
  } catch (error) {
    console.error(`[v0] Failed to resolve country term ID for ${countryCode}:`, error)
    return null
  }
}

export const fetchCategories = async (countryCode: string): Promise<WordPressCategory[]> => {
  return getCategoriesForCountry(countryCode)
}

export const fetchTags = async (countryCode: string): Promise<WordPressTag[]> => {
  try {
    return await executeRestFallback<WordPressTag>(
      countryCode,
      "tags",
      {
        per_page: 100,
        hide_empty: true,
      },
      `Fetch tags for ${countryCode}`,
    )
  } catch (error) {
    console.error(`[v0] Failed to fetch tags for ${countryCode}:`, error)
    return []
  }
}

export const fetchAuthors = async (countryCode: string): Promise<WordPressAuthor[]> => {
  try {
    return await executeRestFallback<WordPressAuthor>(
      countryCode,
      "users",
      {
        per_page: 100,
        who: "authors",
      },
      `Fetch authors for ${countryCode}`,
    )
  } catch (error) {
    console.error(`[v0] Failed to fetch authors for ${countryCode}:`, error)
    return []
  }
}

export const fetchCountries = async (): Promise<CountryConfig[]> => {
  return Object.values(COUNTRIES)
}

export const fetchTaggedPosts = async (countryCode: string, tagSlug: string, limit = 10): Promise<WordPressPost[]> => {
  try {
    const tags = await executeRestFallback<WordPressTag>(
      countryCode,
      "tags",
      { slug: tagSlug },
      `Tag lookup for ${tagSlug}`,
    )

    if (tags && tags.length > 0) {
      return executeRestFallback<WordPressPost>(
        countryCode,
        "posts",
        {
          tags: tags[0].id,
          per_page: limit,
          _embed: 1,
        },
        `Tagged posts for ${tagSlug}`,
      )
    }

    return []
  } catch (error) {
    console.error(`[v0] Failed to fetch tagged posts for ${tagSlug}:`, error)
    return []
  }
}

export const getPostsByCategoryForCountry = async (
  countryCode: string,
  categorySlug: string,
  limit = 20,
  cursor?: string,
): Promise<CategoryPostsResult> => {
  return getPostsByCategory(countryCode, categorySlug, limit, cursor)
}

export const fetchCategoryPosts = async (
  countryCode: string,
  categorySlug: string,
  limit = 20,
): Promise<WordPressPost[]> => {
  const result = await getPostsByCategory(countryCode, categorySlug, limit)
  return result.posts
}

export const getAuthorBySlug = async (
  countryCode: string,
  authorSlug: string,
): Promise<{ author: WordPressAuthor; posts: WordPressPost[] } | null> => {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, AUTHOR_DATA_QUERY, {
      slug: authorSlug,
      first: 10,
    })

    if (gqlData?.user) {
      const author: WordPressAuthor = {
        id: gqlData.user.databaseId,
        name: gqlData.user.name,
        slug: gqlData.user.slug,
        description: gqlData.user.description,
        avatar: gqlData.user.avatar,
      }

      return {
        author,
        posts: gqlData.user.posts?.nodes || [],
      }
    }

    return null
  } catch (error) {
    console.error(`[v0] Failed to fetch author ${authorSlug}:`, error)
    return null
  }
}

export const fetchRecentPosts = async (countryCode: string, limit = 10): Promise<WordPressPost[]> => {
  const result = await getLatestPostsForCountry(countryCode, limit)
  return result.posts
}

export const fetchAllCategories = async (countryCode: string): Promise<WordPressCategory[]> => {
  return getCategoriesForCountry(countryCode)
}

export const fetchAllTags = async (countryCode: string): Promise<WordPressTag[]> => {
  return fetchTags(countryCode)
}

export const fetchSingleTag = async (countryCode: string, tagSlug: string): Promise<WordPressTag | null> => {
  try {
    const tags = await executeRestFallback<WordPressTag>(
      countryCode,
      "tags",
      { slug: tagSlug },
      `Single tag lookup for ${tagSlug}`,
    )

    return tags.length > 0 ? tags[0] : null
  } catch (error) {
    console.error(`[v0] Failed to fetch tag ${tagSlug}:`, error)
    return null
  }
}

export const fetchAuthorData = async (
  countryCode: string,
  authorSlug: string,
): Promise<{ author: WordPressAuthor; posts: WordPressPost[] } | null> => {
  return getAuthorBySlug(countryCode, authorSlug)
}

export const fetchPendingComments = async (countryCode: string): Promise<WordPressComment[]> => {
  try {
    return await executeRestFallback<WordPressComment>(
      countryCode,
      "comments",
      {
        status: "hold",
        per_page: 100,
      },
      `Fetch pending comments for ${countryCode}`,
    )
  } catch (error) {
    console.error(`[v0] Failed to fetch pending comments:`, error)
    return []
  }
}

export const approveComment = async (countryCode: string, commentId: number): Promise<boolean> => {
  try {
    const result = await executeRestFallback<any>(
      countryCode,
      `comments/${commentId}`,
      { status: "approved" },
      `Approve comment ${commentId}`,
    )
    return !!result
  } catch (error) {
    console.error(`[v0] Failed to approve comment ${commentId}:`, error)
    return false
  }
}

export const deleteComment = async (countryCode: string, commentId: number): Promise<boolean> => {
  try {
    const result = await executeRestFallback<any>(
      countryCode,
      `comments/${commentId}`,
      { force: true },
      `Delete comment ${commentId}`,
    )
    return !!result
  } catch (error) {
    console.error(`[v0] Failed to delete comment ${commentId}:`, error)
    return false
  }
}

export const updateUserProfile = async (countryCode: string, userId: number, profileData: any): Promise<boolean> => {
  try {
    const result = await executeRestFallback<any>(
      countryCode,
      `users/${userId}`,
      profileData,
      `Update user profile ${userId}`,
    )
    return !!result
  } catch (error) {
    console.error(`[v0] Failed to update user profile ${userId}:`, error)
    return false
  }
}

// Type exports for compatibility
export type { WordPressPost, WordPressCategory, WordPressTag, WordPressAuthor, WordPressComment, CountryConfig }
export type Post = WordPressPost
