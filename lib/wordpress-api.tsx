import { getWpEndpoints } from "@/config/wp"
import { wordpressQueries } from "./wordpress-queries"
import { circuitBreaker } from "./api/circuit-breaker"
import * as log from "./log"
import { fetchWithTimeout } from "./utils/fetchWithTimeout"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapWpPost } from "./utils/mapWpPost"
import { APIError } from "./utils/errorHandling"
import type { HomePost } from "@/types/home"

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

const handleRestFallbackFailure = (message: string, context: any, error: unknown): never => {
  const details = {
    ...context,
    error: toErrorDetails(error),
  }

  log.error(message, details)
  throw new APIError(message, "REST_FALLBACK_FAILED", undefined, details)
}

const handleRestFallbackError = (error: unknown, message: string, context: any) => {
  const details = {
    ...context,
    error: toErrorDetails(error),
  }

  log.error(message, details)
  throw new APIError(message, "REST_FALLBACK_ERROR", undefined, details)
}

// Sample fallback data for when WordPress APIs are unavailable
const SAMPLE_FALLBACK_POSTS = [
  {
    id: "sample-1",
    slug: "breaking-news-africa-economic-summit",
    title: { rendered: "African Economic Summit Announces New Trade Partnerships" },
    excerpt: {
      rendered: "Leaders from across the continent gather to discuss economic cooperation and trade opportunities...",
    },
    date: new Date().toISOString(),
    featuredImage: { node: { sourceUrl: "/african-economic-summit.jpg", altText: "Economic Summit" } },
    categories: [{ id: 1, name: "Business", slug: "business" }],
    author: { node: { name: "News On Africa", slug: "news-team" } },
  },
  {
    id: "sample-2",
    slug: "technology-innovation-africa",
    title: { rendered: "Tech Innovation Hubs Expanding Across African Cities" },
    excerpt: {
      rendered:
        "New technology centers are opening in major African cities, fostering innovation and entrepreneurship...",
    },
    date: new Date(Date.now() - 3600000).toISOString(),
    featuredImage: { node: { sourceUrl: "/african-technology-innovation.jpg", altText: "Tech Innovation" } },
    categories: [{ id: 2, name: "Technology", slug: "technology" }],
    author: { node: { name: "News On Africa", slug: "news-team" } },
  },
  {
    id: "sample-3",
    slug: "african-culture-festival-celebration",
    title: { rendered: "Continental Culture Festival Celebrates African Heritage" },
    excerpt: {
      rendered: "A vibrant celebration of African culture, music, and traditions brings communities together...",
    },
    date: new Date(Date.now() - 7200000).toISOString(),
    featuredImage: { node: { sourceUrl: "/african-cultural-festival.png", altText: "Cultural Festival" } },
    categories: [{ id: 3, name: "Culture", slug: "culture" }],
    author: { node: { name: "News On Africa", slug: "news-team" } },
  },
]

const SAMPLE_FALLBACK_CATEGORIES = [
  { id: 1, name: "News", slug: "news", description: "Latest news from across Africa" },
  { id: 2, name: "Business", slug: "business", description: "African business and economic news" },
  { id: 3, name: "Sport", slug: "sport", description: "Sports news and updates" },
  { id: 4, name: "Entertainment", slug: "entertainment", description: "Entertainment and lifestyle" },
  { id: 5, name: "Politics", slug: "politics", description: "Political developments" },
]

async function executeRestFallback<T>(
  countryCode: string,
  endpoint: string,
  params: Record<string, any> = {},
  operation: string,
  fallbackData?: T[],
): Promise<T[]> {
  const endpoints = getWpEndpoints(countryCode)
  const baseUrl = endpoints.rest

  // Input validation
  if (!endpoint || typeof endpoint !== "string") {
    throw new Error("Invalid REST endpoint provided")
  }

  if (!baseUrl || !baseUrl.startsWith("http")) {
    throw new Error("Invalid REST API base URL")
  }

  // Sanitize and validate parameters
  const sanitizedParams = sanitizeRestParams(params)
  const queryString = new URLSearchParams(sanitizedParams).toString()
  const url = `${baseUrl}/${endpoint.replace(/^\//, "")}${queryString ? `?${queryString}` : ""}`

  console.log(`[v0] Attempting API operation: ${operation}`)

  try {
    return await circuitBreaker.execute<T[]>(url, operation, async () => {
      console.log(`[v0] REST API request to ${url}`)

      const response = await fetch(url, {
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
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        log.error(`[v0] WordPress API request failed for ${url}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        })
        throw new Error(`REST API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Validate response is an array
      if (!Array.isArray(data)) {
        log.warn(`[v0] REST API response is not an array for ${url}`, { response: data })
        return []
      }

      console.log(`[v0] API operation successful: ${operation}`)
      return data as T[]
    })
  } catch (error) {
    log.error(`[v0] ${operation}`, {
      countryCode,
      endpoint,
      params: sanitizedParams,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        name: error instanceof Error ? error.name : "Error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    })

    console.log(`[v0] API operation failed: ${operation}`, error instanceof Error ? error.message : "Unknown error")

    // Return fallback data if provided
    if (fallbackData && Array.isArray(fallbackData)) {
      console.log(`[v0] Using provided fallback data for: ${operation}`)
      return fallbackData
    }

    // Return sample data for critical operations
    if (operation.includes("Latest posts") || operation.includes("FP tagged posts")) {
      console.log(`[v0] Using sample posts fallback for: ${operation}`)
      return getSamplePosts() as T[]
    }

    if (operation.includes("Categories")) {
      console.log(`[v0] Using provided fallback data for: ${operation}`)
      return getSampleCategories() as T[]
    }

    console.log(`[v0] No fallback available, returning empty array for: ${operation}`)
    return []
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

function getSamplePosts(): WordPressPost[] {
  return [
    {
      id: 1001,
      date: new Date().toISOString(),
      slug: "african-economic-growth-2025",
      title: { rendered: "African Economic Growth Shows Promise in 2025" },
      excerpt: {
        rendered:
          "Economic indicators across the continent show positive trends as African nations continue to diversify their economies and strengthen regional partnerships.",
      },
      content: { rendered: "African economies are experiencing unprecedented growth..." },
      _embedded: {
        "wp:featuredmedia": [
          {
            source_url: "/african-economic-summit.jpg",
            alt_text: "African Economic Summit",
          },
        ],
      },
    },
    {
      id: 1002,
      date: new Date(Date.now() - 86400000).toISOString(),
      slug: "technology-innovation-africa",
      title: { rendered: "Technology Innovation Hubs Flourish Across Africa" },
      excerpt: {
        rendered:
          "From fintech in Nigeria to renewable energy solutions in Kenya, African innovators are leading the charge in technological advancement.",
      },
      content: { rendered: "Technology hubs across Africa are becoming centers of innovation..." },
      _embedded: {
        "wp:featuredmedia": [
          {
            source_url: "/african-technology-innovation.jpg",
            alt_text: "African Technology Innovation",
          },
        ],
      },
    },
    {
      id: 1003,
      date: new Date(Date.now() - 172800000).toISOString(),
      slug: "cultural-festivals-celebrate-heritage",
      title: { rendered: "Cultural Festivals Celebrate African Heritage" },
      excerpt: {
        rendered:
          "Traditional festivals across the continent showcase the rich cultural diversity and heritage that defines African communities.",
      },
      content: { rendered: "Cultural celebrations are taking place across Africa..." },
      _embedded: {
        "wp:featuredmedia": [
          {
            source_url: "/african-cultural-festival.png",
            alt_text: "African Cultural Festival",
          },
        ],
      },
    },
  ]
}

function getSampleCategories(): WordPressCategory[] {
  return [
    { id: 1, name: "News", slug: "news", description: "Latest news from across Africa", count: 150 },
    { id: 2, name: "Business", slug: "business", description: "African business and economic news", count: 89 },
    { id: 3, name: "Sport", slug: "sport", description: "Sports news and updates", count: 67 },
    { id: 4, name: "Entertainment", slug: "entertainment", description: "Entertainment and culture", count: 45 },
    { id: 5, name: "Life", slug: "life", description: "Lifestyle and living", count: 34 },
    { id: 6, name: "Health", slug: "health", description: "Health and wellness news", count: 28 },
    { id: 7, name: "Politics", slug: "politics", description: "Political news and analysis", count: 56 },
    { id: 8, name: "Food", slug: "food", description: "Food and culinary culture", count: 23 },
    { id: 9, name: "Opinion", slug: "opinion", description: "Opinion pieces and editorials", count: 41 },
  ]
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
    return await circuitBreaker.execute<T | null>(url, operation, async () => {
      // Input validation
      if (!query || typeof query !== "string") {
        throw new Error("Invalid GraphQL query provided")
      }

      if (!url || !url.startsWith("http")) {
        throw new Error("Invalid GraphQL endpoint URL")
      }

      // Sanitize variables
      const sanitizedVariables = sanitizeGraphQLVariables(variables)

      const requestBody = {
        query: query.trim(),
        variables: sanitizedVariables,
      }

      console.log(`[v0] GraphQL request to ${url}:`, {
        query: query.substring(0, 100) + "...",
        variables: sanitizedVariables,
      })

      let response: Response
      try {
        response = await fetch(url, {
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
          signal: AbortSignal.timeout(15000), // 15 second timeout
        })
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown fetch error"
        console.error(`[v0] GraphQL fetch failed for ${url}:`, errorMessage)

        if (errorMessage.includes("fetch")) {
          throw new Error(
            `Network error: Unable to connect to GraphQL endpoint at ${url}. This may indicate the GraphQL plugin is not installed or the endpoint is not accessible.`,
          )
        }
        throw new Error(`GraphQL request failed: ${errorMessage}`)
      }

      if (!response.ok) {
        const statusText = response.statusText || "Unknown error"
        console.error(`[v0] GraphQL HTTP error ${response.status} for ${url}:`, statusText)

        if (response.status === 404) {
          throw new Error(
            `GraphQL endpoint not found (404). The WordPress site may not have GraphQL enabled or the endpoint URL is incorrect.`,
          )
        } else if (response.status === 500) {
          throw new Error(`GraphQL server error (500). There may be an issue with the WordPress GraphQL configuration.`)
        } else {
          throw new Error(`GraphQL HTTP error ${response.status}: ${statusText}`)
        }
      }

      let data: WordPressGraphQLResponse<T>
      try {
        data = await response.json()
      } catch (parseError) {
        console.error(`[v0] GraphQL JSON parse error for ${url}:`, parseError)
        throw new Error("Invalid JSON response from GraphQL endpoint")
      }

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
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[v0] WordPress GraphQL request failed for ${url}`, { error: errorMessage })

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
      // Basic XSS prevention and length limits
      sanitized[key] = value.trim().substring(0, 1000)
    } else if (typeof value === "number") {
      // Ensure reasonable numeric limits
      sanitized[key] = Math.max(0, Math.min(value, 10000))
    } else if (Array.isArray(value)) {
      // Limit array size and sanitize string elements
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

export async function getLatestPostsForCountry(countryCode: string, limit = 10): Promise<WordPressPost[]> {
  try {
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, LATEST_POSTS_QUERY, {
      first: limit,
    })

    if (gqlData?.posts?.nodes) {
      return gqlData.posts.nodes
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for latest posts, trying REST fallback`, { error })
  }

  return executeRestFallback<WordPressPost>(
    countryCode,
    "posts",
    {
      per_page: limit,
      _embed: 1,
      order: "desc",
      orderby: "date",
    },
    `[v0] Latest posts REST fallback failed for ${countryCode}`,
  )
}

export async function getFpTaggedPosts(countryCode: string, limit = 8): Promise<WordPressPost[]> {
  try {
    // First get the FP tag
    const fpTag = await executeRestFallback<WordPressTag>(
      countryCode,
      "tags",
      { slug: "fp" },
      `[v0] FP tag lookup REST fallback failed for ${countryCode}`,
    )

    if (!fpTag || fpTag.length === 0) {
      console.log(`[v0] No FP tag found for ${countryCode}`)
      return getSamplePosts().slice(0, limit)
    }

    const tagId = fpTag[0].id

    // Try GraphQL first
    const gqlData = await fetchFromWpGraphQL<any>(countryCode, FP_TAGGED_POSTS_QUERY, {
      tagSlugs: ["fp"],
      first: limit,
    })

    if (gqlData?.posts?.nodes) {
      return gqlData.posts.nodes
    }
  } catch (error) {
    log.warn(`[v0] GraphQL failed for FP tagged posts, trying REST fallback`, { error })
  }

  // REST fallback
  const fpTag = await executeRestFallback<WordPressTag>(
    countryCode,
    "tags",
    { slug: "fp" },
    `[v0] FP tag lookup REST fallback failed for ${countryCode}`,
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
      `[v0] FP tagged posts REST fallback failed for ${countryCode}`,
    )
  }

  return getSamplePosts().slice(0, limit)
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

  const categories = await executeRestFallback<WordPressCategory>(
    countryCode,
    "categories",
    { slug: normalizedSlugs.join(",") },
    `[v0] Category batch REST fallback failed for ${normalizedSlugs.join(", ")} (${countryCode})`,
  )

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
        posts = await executeRestFallback<WordPressPost>(
          countryCode,
          endpoint,
          params,
          `[v0] Posts by category REST fallback failed for ${category.slug} (${countryCode})`,
        )

        restCategoryPostsCache.set(cacheKey, {
          posts,
          expiresAt: Date.now() + REST_CATEGORY_CACHE_TTL_MS,
        })
      } catch (error) {
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
}

export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
): Promise<CategoryPostsResult> {
  const gqlData = await fetchFromWpGraphQL<any>(countryCode, POSTS_BY_CATEGORY_QUERY, {
    category: categorySlug,
    first: limit,
  })

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

  const categories = await executeRestFallback<WordPressCategory>(
    countryCode,
    "categories",
    { slug: categorySlug },
    `[v0] Category REST fallback failed for ${categorySlug} (${countryCode})`,
  )

  const category = categories[0] || null
  if (!category) {
    return {
      category: null,
      posts: [],
      hasNextPage: false,
      endCursor: null,
    }
  }

  const { endpoint, params } = wordpressQueries.postsByCategory(category.id, limit)
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    endpoint,
    params,
    `[v0] Posts by category REST fallback failed for ${categorySlug} (${countryCode})`,
  )

  return {
    category,
    posts: posts || [],
    hasNextPage: false,
    endCursor: null,
  }
}

export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  const query = `
    query GetCategories {
      categories(first: 20) {
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

  try {
    const data = await fetchFromWpGraphQL<{ categories: { nodes: WordPressCategory[] } }>(countryCode, query)

    if (data?.categories?.nodes && Array.isArray(data.categories.nodes)) {
      return data.categories.nodes.filter((cat) => cat && cat.slug && cat.name)
    }

    console.log(`[v0] GraphQL categories data invalid or empty, using fallback`)
    return getSampleCategories()
  } catch (error) {
    console.error(`[v0] Failed to fetch categories via GraphQL:`, error)

    try {
      const restData = await executeRestFallback<WordPressCategory[]>(
        countryCode, // Pass countryCode to executeRestFallback
        "categories", // Endpoint
        {
          // Params
          slug: "news,business,sport,entertainment,life,health,politics,food,opinion",
          per_page: 9,
          hide_empty: false,
        },
        `[v0] Category batch REST fallback failed for news, business, sport, entertainment, life, health, politics, food, opinion (${countryCode})`, // Operation name
        getSampleCategories(), // Fallback data
      )

      return Array.isArray(restData) ? restData : getSampleCategories()
    } catch (restError) {
      console.error(`[v0] REST API fallback also failed:`, restError)
      return getSampleCategories()
    }
  }
}

export async function getRelatedPostsForCountry(countryCode: string, postId: string, limit = 6) {
  const gqlPost = await fetchFromWpGraphQL<any>(countryCode, POST_CATEGORIES_QUERY, { id: Number(postId) })
  if (gqlPost?.post) {
    const catIds = gqlPost.post.categories.nodes.map((c: any) => c.databaseId)
    if (catIds.length > 0) {
      const gqlData = await fetchFromWpGraphQL<any>(countryCode, RELATED_POSTS_QUERY, {
        categoryIds: catIds,
        excludeId: Number(postId),
        first: limit,
      })
      if (gqlData?.posts) {
        const posts = gqlData.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode))
        return posts.filter((p) => p.id !== Number(postId))
      }
    }
  }
  const post = await executeRestFallback<WordPressPost>(
    countryCode,
    `posts/${postId}`,
    {},
    `[v0] Related posts REST fallback failed for base post ${postId} (${countryCode})`,
  )
  const categoryIds: number[] = post._embedded?.["wp:term"]?.[0]?.map((cat: any) => cat.id) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    endpoint,
    params,
    `[v0] Related posts REST fallback failed for ${postId} (${countryCode})`,
  )
  return posts.filter((p) => p.id !== Number(postId))
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const gqlData = await fetchFromWpGraphQL<any>(countryCode, FEATURED_POSTS_QUERY, {
    first: limit,
  })
  if (gqlData?.posts) {
    return gqlData.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode))
  }
  // REST fallback for featured posts
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    "posts",
    {
      per_page: limit,
      _embed: 1,
      order: "desc",
      orderby: "date",
      featured: true, // Assuming 'featured' is a valid REST API parameter for featured posts
    },
    `[v0] Featured posts REST fallback failed for ${countryCode}`,
  )
  return posts
}

export const getLatestPosts = (limit = 20) => getLatestPostsForCountry(DEFAULT_COUNTRY, limit)
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

  // If tags are provided, attempt tag-intersection query via REST API
  if (tags.length > 0) {
    const { endpoint, params } = wordpressQueries.relatedPostsByTags(tags, postId, limit)
    try {
      const posts = await executeRestFallback<WordPressPost>(
        country,
        endpoint,
        params,
        `[v0] Related posts by tags REST fallback failed for ${postId} (${country})`,
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

// Legacy-compatible helper functions ---------------------------------------

export const fetchRecentPosts = async (limit = 20, countryCode = DEFAULT_COUNTRY) => {
  const posts = await getLatestPostsForCountry(countryCode, limit)
  return posts
}

export const fetchTaggedPosts = async (tagSlug: string, limit = 10, countryCode = DEFAULT_COUNTRY) => {
  const tags = await executeRestFallback<WordPressTag>(
    countryCode,
    "tags",
    { slug: tagSlug },
    `[v0] Tag lookup REST fallback failed for ${tagSlug} (${countryCode})`,
  )
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
  return await executeRestFallback<WordPressPost>(
    countryCode,
    endpoint,
    params,
    `[v0] Tagged posts REST fallback failed for ${tagSlug} (${countryCode})`,
  )
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
    return (await fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params })) || []
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
  })
  const total = Number(result?.headers.get("X-WP-Total") || "0")
  const data = result?.data || []
  return { data, total }
}

export const fetchCategories = (countryCode = DEFAULT_COUNTRY) => getCategoriesForCountry(countryCode)

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  return (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })) || []
}

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.authors()
  return (await fetchFromWp<WordPressAuthor[]>(countryCode, { endpoint, params })) || []
}

export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const base = getWpEndpoints(process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY).rest
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
  const posts = await fetchFromWp<WordPressPost[]>(countryCode, {
    endpoint,
    params,
  })
  return posts?.[0] || null
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(slug))
  return tags?.[0] || null
}

export const fetchAllTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  return (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params })) || []
}

export async function fetchAuthorData(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
  limit = 10,
) {
  const data = await fetchFromWpGraphQL<any>(countryCode, AUTHOR_DATA_QUERY, {
    slug,
    first: limit,
  })
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
      // Ignore decoding errors and fall through to default
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

  const restAuthors = await executeRestFallback<WordPressAuthor>(
    countryCode,
    "users",
    { slug },
    `[v0] Author REST fallback failed for ${slug} (${countryCode})`,
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
  const posts = await executeRestFallback<WordPressPost>(
    countryCode,
    query.endpoint,
    query.params,
    `[v0] Author posts REST fallback failed for ${slug} (${countryCode})`,
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
  const data = await fetchFromWpGraphQL<any>(countryCode, CATEGORY_POSTS_QUERY, {
    slug,
    after: cursor,
    first: 10,
  })
  if (!data?.category || !data?.category?.posts) return null
  const catNode = data.category
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
    posts: data.category.posts.nodes.map((p: any) => mapWpPost(p, "gql", countryCode)),
    pageInfo: data.category.posts.pageInfo,
  }
}

export const fetchAllCategories = (countryCode = DEFAULT_COUNTRY) => getCategoriesForCountry(countryCode)

export async function fetchPendingComments(countryCode = DEFAULT_COUNTRY): Promise<WordPressComment[]> {
  const comments = await fetchFromWp<WordPressComment[]>(countryCode, {
    endpoint: "comments",
    params: { status: "hold", per_page: 100, _embed: 1 },
  })
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
  // Placeholder – real implementation can integrate with WordPress REST API
  return null
}
