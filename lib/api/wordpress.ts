import {
  LATEST_POSTS_QUERY,
  POST_BY_SLUG_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  FEATURED_POSTS_QUERY,
} from "@/lib/graphql/queries"
import { fetchRecentPosts, fetchCategoryPosts, fetchSinglePost } from "../wordpress-api"
import { relatedPostsCache } from "@/lib/cache/related-posts-cache"
import type { Post, Category } from "@/types/content"

const WORDPRESS_GRAPHQL_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://newsonafrica.com/sz/graphql"
const WORDPRESS_REST_URL = process.env.WORDPRESS_REST_API_URL || "https://newsonafrica.com/sz/wp-json/wp/v2"

// TypeScript interfaces for WordPress data
export interface WordPressImage {
  sourceUrl: string
  altText?: string
  title?: string
}

export interface WordPressAuthor {
  id: string
  name: string
  slug: string
  description?: string
  avatar?: {
    url: string
  }
}

export interface WordPressCategory {
  id: string
  name: string
  slug: string
  description?: string
  count?: number
  parent?: {
    node: {
      name: string
      slug: string
    }
  }
}

export interface WordPressTag {
  id: string
  name: string
  slug: string
  description?: string
}

export interface WordPressPost {
  id: string
  title: string
  content?: string
  excerpt: string
  slug: string
  date: string
  modified?: string
  status?: string
  featuredImage?: {
    node: WordPressImage
  }
  author: {
    node: WordPressAuthor
  }
  categories: {
    nodes: WordPressCategory[]
  }
  tags: {
    nodes: WordPressTag[]
  }
  seo?: {
    title: string
    metaDesc: string
    opengraphImage?: {
      sourceUrl: string
    }
  }
}

export interface WordPressPostsResponse {
  posts: {
    nodes: WordPressPost[]
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
}

export interface WordPressCategoriesResponse {
  categories: {
    nodes: WordPressCategory[]
  }
}

export interface WordPressSinglePostResponse {
  post: WordPressPost | null
}

// Country configuration
export interface CountryConfig {
  code: string
  name: string
  flag: string
  currency: string
  timezone: string
  languages: string[]
  apiEndpoint: string
  restEndpoint: string
}

export const COUNTRIES: Record<string, CountryConfig> = {
  sz: {
    code: "sz",
    name: "Eswatini",
    flag: "🇸🇿",
    currency: "SZL",
    timezone: "Africa/Mbabane",
    languages: ["en", "ss"],
    apiEndpoint: "https://newsonafrica.com/sz/graphql",
    restEndpoint: "https://newsonafrica.com/sz/wp-json/wp/v2",
  },
  ng: {
    code: "ng",
    name: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    timezone: "Africa/Lagos",
    languages: ["en"],
    apiEndpoint: "https://newsonafrica.com/ng/graphql",
    restEndpoint: "https://newsonafrica.com/ng/wp-json/wp/v2",
  },
  ke: {
    code: "ke",
    name: "Kenya",
    flag: "🇰🇪",
    currency: "KES",
    timezone: "Africa/Nairobi",
    languages: ["en", "sw"],
    apiEndpoint: "https://newsonafrica.com/ke/graphql",
    restEndpoint: "https://newsonafrica.com/ke/wp-json/wp/v2",
  },
  za: {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    languages: ["en", "af", "zu", "xh"],
    apiEndpoint: "https://newsonafrica.com/za/graphql",
    restEndpoint: "https://newsonafrica.com/za/wp-json/wp/v2",
  },
  gh: {
    code: "gh",
    name: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    timezone: "Africa/Accra",
    languages: ["en"],
    apiEndpoint: "https://newsonafrica.com/gh/graphql",
    restEndpoint: "https://newsonafrica.com/gh/wp-json/wp/v2",
  },
  ug: {
    code: "ug",
    name: "Uganda",
    flag: "🇺🇬",
    currency: "UGX",
    timezone: "Africa/Kampala",
    languages: ["en"],
    apiEndpoint: "https://newsonafrica.com/ug/graphql",
    restEndpoint: "https://newsonafrica.com/ug/wp-json/wp/v2",
  },
  tz: {
    code: "tz",
    name: "Tanzania",
    flag: "🇹🇿",
    currency: "TZS",
    timezone: "Africa/Dar_es_Salaam",
    languages: ["en", "sw"],
    apiEndpoint: "https://newsonafrica.com/tz/graphql",
    restEndpoint: "https://newsonafrica.com/tz/wp-json/wp/v2",
  },
  rw: {
    code: "rw",
    name: "Rwanda",
    flag: "🇷🇼",
    currency: "RWF",
    timezone: "Africa/Kigali",
    languages: ["en", "rw", "fr"],
    apiEndpoint: "https://newsonafrica.com/rw/graphql",
    restEndpoint: "https://newsonafrica.com/rw/wp-json/wp/v2",
  },
}

// Utility function to get country-specific endpoints
function getCountryEndpoints(countryCode: string) {
  const country = COUNTRIES[countryCode]
  if (!country) {
    // Fallback to default (sz)
    return {
      graphql: COUNTRIES.sz.apiEndpoint,
      rest: COUNTRIES.sz.restEndpoint,
    }
  }
  return {
    graphql: country.apiEndpoint,
    rest: country.restEndpoint,
  }
}

// Enhanced cache with LRU-like behavior
const categoryCache = new Map<string, { data: any; timestamp: number; hits: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

// Cache cleanup function
function cleanupCache() {
  if (categoryCache.size <= MAX_CACHE_SIZE) return

  // Sort by hits and timestamp, remove least used entries
  const entries = Array.from(categoryCache.entries()).sort((a, b) => {
    const aScore = a[1].hits + (Date.now() - a[1].timestamp) / 1000
    const bScore = b[1].hits + (Date.now() - b[1].timestamp) / 1000
    return aScore - bScore
  })

  // Remove oldest 25% of entries
  const toRemove = Math.floor(entries.length * 0.25)
  for (let i = 0; i < toRemove; i++) {
    categoryCache.delete(entries[i][0])
  }
}

interface HealthCheckResult {
  endpoint: string
  status: "healthy" | "unhealthy" | "unknown"
  responseTime: number
  error?: string
}

// Health check cache to avoid repeated checks
const healthCheckCache = new Map<string, { result: HealthCheckResult; timestamp: number }>()
const HEALTH_CHECK_TTL = 2 * 60 * 1000 // 2 minutes

// Circuit breaker state
const circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>()
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000 // 5 minutes

// Check if circuit breaker is open
function isCircuitBreakerOpen(endpoint: string): boolean {
  const breaker = circuitBreakers.get(endpoint)
  if (!breaker) return false

  if (breaker.isOpen && Date.now() - breaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    // Reset circuit breaker after timeout
    breaker.isOpen = false
    breaker.failures = 0
  }

  return breaker.isOpen
}

// Record circuit breaker failure
function recordCircuitBreakerFailure(endpoint: string) {
  const breaker = circuitBreakers.get(endpoint) || { failures: 0, lastFailure: 0, isOpen: false }
  breaker.failures++
  breaker.lastFailure = Date.now()

  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.isOpen = true
    console.warn(`Circuit breaker opened for ${endpoint} after ${breaker.failures} failures`)
  }

  circuitBreakers.set(endpoint, breaker)
}

// Reset circuit breaker on success
function resetCircuitBreaker(endpoint: string) {
  const breaker = circuitBreakers.get(endpoint)
  if (breaker) {
    breaker.failures = 0
    breaker.isOpen = false
    circuitBreakers.set(endpoint, breaker)
  }
}

// Health check function
async function checkEndpointHealth(endpoint: string): Promise<HealthCheckResult> {
  const cached = healthCheckCache.get(endpoint)
  if (cached && Date.now() - cached.timestamp < HEALTH_CHECK_TTL) {
    return cached.result
  }

  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for health checks

    const response = await fetch(endpoint, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "NewsOnAfrica-HealthCheck/1.0",
      },
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    const result: HealthCheckResult = {
      endpoint,
      status: response.ok ? "healthy" : "unhealthy",
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    }

    healthCheckCache.set(endpoint, { result, timestamp: Date.now() })
    return result
  } catch (error) {
    const responseTime = Date.now() - startTime
    const result: HealthCheckResult = {
      endpoint,
      status: "unhealthy",
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }

    healthCheckCache.set(endpoint, { result, timestamp: Date.now() })
    return result
  }
}

// Enhanced utility function to make GraphQL requests with better error handling
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, any> = {},
  countryCode?: string,
  retries = 3,
): Promise<T> {
  const endpoints = getCountryEndpoints(countryCode || "sz")

  // Check circuit breaker
  if (isCircuitBreakerOpen(endpoints.graphql)) {
    throw new Error(`Circuit breaker is open for ${endpoints.graphql}`)
  }

  // Check endpoint health first
  const healthCheck = await checkEndpointHealth(endpoints.graphql)
  if (healthCheck.status === "unhealthy") {
    console.warn(`Endpoint ${endpoints.graphql} is unhealthy: ${healthCheck.error}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    console.log(`[v0] Making GraphQL request to ${endpoints.graphql}`)

    const response = await fetch(endpoints.graphql, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "NewsOnAfrica/1.0",
        Connection: "keep-alive",
        // Add potential authentication headers if needed
        ...(process.env.WORDPRESS_AUTH_TOKEN && {
          Authorization: `Bearer ${process.env.WORDPRESS_AUTH_TOKEN}`,
        }),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    clearTimeout(timeoutId)

    console.log(`[v0] GraphQL response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response")
      const error = new Error(
        `GraphQL request failed: ${response.status} ${response.statusText}. Response: ${errorText}`,
      )
      recordCircuitBreakerFailure(endpoints.graphql)
      throw error
    }

    const result = await response.json()
    console.log(`[v0] GraphQL response received successfully`)

    if (result.errors) {
      console.error("GraphQL errors:", result.errors)
      const error = new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(", ")}`)
      recordCircuitBreakerFailure(endpoints.graphql)
      throw error
    }

    // Success - reset circuit breaker
    resetCircuitBreaker(endpoints.graphql)
    return result.data
  } catch (error) {
    clearTimeout(timeoutId)

    console.error(`[v0] GraphQL request failed:`, error)
    recordCircuitBreakerFailure(endpoints.graphql)

    if (retries > 0 && error instanceof Error) {
      console.warn(`[v0] GraphQL request failed, retrying... (${retries} attempts left)`)
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, 3 - retries), 5000)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return graphqlRequest<T>(query, variables, countryCode, retries - 1)
    }

    throw error
  }
}

// Enhanced REST API fallback function with better error handling
async function restApiFallback<T>(
  endpoint: string,
  params: Record<string, any> = {},
  transform: (data: any) => T,
  countryCode?: string,
): Promise<T> {
  const endpoints = getCountryEndpoints(countryCode || "sz")

  // Check circuit breaker
  if (isCircuitBreakerOpen(endpoints.rest)) {
    throw new Error(`Circuit breaker is open for ${endpoints.rest}`)
  }

  const queryParams = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()

  const url = `${endpoints.rest}/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  try {
    console.log(`[v0] Making REST API request to ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for REST

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "NewsOnAfrica/1.0",
        // Add potential authentication headers if needed
        ...(process.env.WP_APP_USERNAME &&
          process.env.WP_APP_PASSWORD && {
            Authorization: `Basic ${Buffer.from(`${process.env.WP_APP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64")}`,
          }),
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    })

    clearTimeout(timeoutId)
    console.log(`[v0] REST API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response")
      const error = new Error(
        `REST API request failed: ${response.status} ${response.statusText}. Response: ${errorText}`,
      )
      recordCircuitBreakerFailure(endpoints.rest)
      throw error
    }

    const data = await response.json()
    console.log(`[v0] REST API response received successfully`)

    // Success - reset circuit breaker
    resetCircuitBreaker(endpoints.rest)
    return transform(data)
  } catch (error) {
    console.error(`[v0] REST API fallback failed:`, error)
    recordCircuitBreakerFailure(endpoints.rest)
    throw error
  }
}

async function fetchWithMultipleCountryFallback<T>(
  primaryCountry: string,
  fetchFunction: (countryCode: string) => Promise<T>,
  fallbackCountries: string[] = ["ng", "ke", "za", "gh"],
): Promise<T> {
  // Try primary country first
  try {
    return await fetchFunction(primaryCountry)
  } catch (primaryError) {
    console.warn(`[v0] Primary country ${primaryCountry} failed:`, primaryError)

    // Try fallback countries
    for (const fallbackCountry of fallbackCountries) {
      if (fallbackCountry === primaryCountry) continue

      try {
        console.log(`[v0] Trying fallback country: ${fallbackCountry}`)
        const result = await fetchFunction(fallbackCountry)
        console.log(`[v0] Fallback country ${fallbackCountry} succeeded`)
        return result
      } catch (fallbackError) {
        console.warn(`[v0] Fallback country ${fallbackCountry} failed:`, fallbackError)
        continue
      }
    }

    // If all countries failed, throw the original error
    throw primaryError
  }
}

/**
 * Get the latest posts from WordPress for a specific country
 */
export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 20,
  after?: string,
): Promise<{ posts: WordPressPost[]; hasNextPage: boolean; endCursor: string | null }> {
  try {
    const data = await graphqlRequest<WordPressPostsResponse>(
      LATEST_POSTS_QUERY,
      {
        first: limit,
        after,
      },
      countryCode,
    )

    return {
      posts: data.posts.nodes,
      hasNextPage: data.posts.pageInfo.hasNextPage,
      endCursor: data.posts.pageInfo.endCursor,
    }
  } catch (error) {
    console.error(`Failed to fetch latest posts for ${countryCode} via GraphQL, trying REST API:`, error)

    try {
      return await restApiFallback(
        "posts",
        { per_page: limit, _embed: 1 },
        (posts: any[]) => ({
          posts: posts.map(transformRestPostToGraphQL),
          hasNextPage: posts.length === limit,
          endCursor: null,
        }),
        countryCode,
      )
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return { posts: [], hasNextPage: false, endCursor: null }
    }
  }
}

/**
 * Get posts by category for a specific country with enhanced error handling
 */
export async function getPostsByCategoryForCountry(
  countryCode: string,
  categorySlug: string,
  limit = 20,
  after?: string,
): Promise<{
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}> {
  return fetchWithMultipleCountryFallback(countryCode, async (country) => {
    try {
      const data = await graphqlRequest<{ category: any }>(
        POSTS_BY_CATEGORY_QUERY,
        {
          slug: categorySlug,
          first: limit,
          after,
        },
        country,
      )

      if (!data.category) {
        return { category: null, posts: [], hasNextPage: false, endCursor: null }
      }

      return {
        category: {
          id: data.category.id,
          name: data.category.name,
          slug: data.category.slug,
          description: data.category.description,
        },
        posts: data.category.posts.nodes,
        hasNextPage: data.category.posts.pageInfo.hasNextPage,
        endCursor: data.category.posts.pageInfo.endCursor,
      }
    } catch (error) {
      console.error(`Failed to fetch category "${categorySlug}" for ${country} via GraphQL, trying REST API:`, error)

      try {
        // First get category info
        const categories = await restApiFallback(`categories?slug=${categorySlug}`, {}, (cats: any[]) => cats, country)

        if (!categories || categories.length === 0) {
          return { category: null, posts: [], hasNextPage: false, endCursor: null }
        }

        const category = categories[0]

        // Then get posts for this category
        const posts = await restApiFallback(
          "posts",
          { categories: category.id, per_page: limit, _embed: 1 },
          (posts: any[]) => posts.map(transformRestPostToGraphQL),
          country,
        )

        return {
          category: transformRestCategoryToGraphQL(category),
          posts,
          hasNextPage: posts.length === limit,
          endCursor: null,
        }
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        throw restError
      }
    }
  })
}

/**
 * Get categories for a specific country
 */
export async function getCategoriesForCountry(countryCode: string): Promise<WordPressCategory[]> {
  try {
    const data = await graphqlRequest<WordPressCategoriesResponse>(CATEGORIES_QUERY, {}, countryCode)
    return data.categories.nodes
  } catch (error) {
    console.error(`Failed to fetch categories for ${countryCode} via GraphQL, trying REST API:`, error)

    try {
      return await restApiFallback(
        "categories",
        { per_page: 100 },
        (categories: any[]) => categories.map(transformRestCategoryToGraphQL),
        countryCode,
      )
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return []
    }
  }
}

/**
 * Get the latest posts from WordPress
 */
export async function getLatestPosts(limit = 20, after?: string): Promise<{ posts: Post[]; error: string | null }> {
  try {
    const posts = await fetchRecentPosts(limit)
    return {
      posts: (posts || []) as unknown as Post[],
      error: null,
    }
  } catch (error) {
    console.error("Failed to fetch latest posts:", error)
    return {
      posts: [],
      error: error instanceof Error ? error.message : "Failed to fetch posts",
    }
  }
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<WordPressPost | null> {
  try {
    const data = await graphqlRequest<WordPressSinglePostResponse>(POST_BY_SLUG_QUERY, {
      slug,
    })

    return data.post
  } catch (error) {
    console.error(`Failed to fetch post "${slug}" via GraphQL, trying REST API:`, error)

    try {
      return await restApiFallback(`posts?slug=${slug}&_embed=1`, {}, (posts: any[]) => {
        if (!posts || posts.length === 0) return null
        return transformRestPostToGraphQL(posts[0])
      })
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return null
    }
  }
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  return getCategoriesForCountry("sz") as unknown as Category[]
}

/**
 * Get posts by category with caching
 */
export async function getPostsByCategory(
  categorySlug: string,
  limit = 20,
  after?: string | null,
): Promise<{
  category: Category | null
  posts: Post[]
  hasNextPage: boolean
  endCursor: string | null
}> {
  // Create cache key
  const cacheKey = `category:${categorySlug}:${limit}:${after || "null"}`

  // Check cache first
  const cached = categoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Increment hit counter
    cached.hits++
    return cached.data
  }

  try {
    // If not in cache, fetch from API
    const result = await getPostsByCategoryForCountry("sz", categorySlug, limit, after || null)

    // Cache the result
    categoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 1,
    })

    // Cleanup cache if needed
    cleanupCache()

    return result as unknown as {
      category: Category | null
      posts: Post[]
      hasNextPage: boolean
      endCursor: string | null
    }
  } catch (error) {
    // If we have stale cached data, return it as fallback
    if (cached) {
      console.warn("Using stale cache data due to API error:", error)
      return cached.data
    }
    throw error
  }
}

/**
 * Get featured posts (sticky posts)
 */
export async function getFeaturedPosts(limit = 10): Promise<WordPressPost[]> {
  try {
    const data = await graphqlRequest<WordPressPostsResponse>(FEATURED_POSTS_QUERY, {
      first: limit,
    })

    return data.posts.nodes
  } catch (error) {
    console.error("Failed to fetch featured posts via GraphQL, trying REST API:", error)

    try {
      return await restApiFallback("posts", { sticky: true, per_page: limit, _embed: 1 }, (posts: any[]) =>
        posts.map(transformRestPostToGraphQL),
      )
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return []
    }
  }
}

/**
 * Get posts by category with error handling
 */
export async function getCategoryPosts(slug: string, after?: string) {
  try {
    const category = await fetchCategoryPosts(slug, after)
    return {
      category,
      error: null,
    }
  } catch (error) {
    console.error(`Failed to fetch category posts for ${slug}:`, error)
    return {
      category: {
        id: "",
        name: slug,
        description: "",
        posts: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        },
      },
      error: error instanceof Error ? error.message : "Failed to fetch category posts",
    }
  }
}

/**
 * Get single post with error handling
 */
export async function getPost(slug: string) {
  try {
    const post = await fetchSinglePost(slug)
    return {
      post,
      error: null,
    }
  } catch (error) {
    console.error(`Failed to fetch post ${slug}:`, error)
    return {
      post: null,
      error: error instanceof Error ? error.message : "Failed to fetch post",
    }
  }
}

/**
 * Get related posts based on categories and tags with caching
 */
export async function getRelatedPosts(
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
): Promise<WordPressPost[]> {
  // Check cache first
  const cached = relatedPostsCache.get(postId, categories, tags, limit, countryCode)
  if (cached) {
    return cached
  }

  try {
    // Create GraphQL query for related posts
    const RELATED_POSTS_QUERY = `
      query GetRelatedPosts($categoryIn: [ID], $tagIn: [ID], $notIn: [ID], $first: Int) {
        posts(
          where: {
            categoryIn: $categoryIn
            tagIn: $tagIn
            notIn: $notIn
            orderby: { field: DATE, order: DESC }
          }
          first: $first
        ) {
          nodes {
            id
            title
            excerpt
            slug
            date
            modified
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
            author {
              node {
                id
                name
                slug
                firstName
                lastName
                avatar {
                  url
                }
              }
            }
            categories {
              nodes {
                id
                name
                slug
              }
            }
            tags {
              nodes {
                id
                name
                slug
              }
            }
            seo {
              title
              metaDesc
            }
          }
        }
      }
    `

    // Try categories first, then tags if not enough results
    let relatedPosts: WordPressPost[] = []

    if (categories.length > 0) {
      const categoryData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          categoryIn: categories,
          notIn: [postId],
          first: limit,
        },
        countryCode,
      )
      relatedPosts = categoryData.posts.nodes
    }

    // If we don't have enough posts from categories, try tags
    if (relatedPosts.length < limit && tags.length > 0) {
      const remainingLimit = limit - relatedPosts.length
      const tagData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          tagIn: tags,
          notIn: [postId, ...relatedPosts.map((p) => p.id)],
          first: remainingLimit,
        },
        countryCode,
      )
      relatedPosts = [...relatedPosts, ...tagData.posts.nodes]
    }

    // If still not enough, get latest posts from same categories
    if (relatedPosts.length < 3 && categories.length > 0) {
      const remainingLimit = Math.max(3 - relatedPosts.length, 0)
      const latestData = await graphqlRequest<{ posts: { nodes: WordPressPost[] } }>(
        RELATED_POSTS_QUERY,
        {
          categoryIn: categories,
          notIn: [postId, ...relatedPosts.map((p) => p.id)],
          first: remainingLimit,
        },
        countryCode,
      )
      relatedPosts = [...relatedPosts, ...latestData.posts.nodes]
    }

    const finalPosts = relatedPosts.slice(0, limit)

    // Cache the result
    relatedPostsCache.set(postId, categories, tags, limit, finalPosts, countryCode)

    return finalPosts
  } catch (error) {
    console.error("Failed to fetch related posts via GraphQL, trying REST API:", error)

    try {
      // REST API fallback
      const endpoints = getCountryEndpoints(countryCode || "sz")

      // Build query parameters for REST API
      const params = new URLSearchParams({
        per_page: limit.toString(),
        exclude: postId,
        _embed: "1",
      })

      if (categories.length > 0) {
        params.append("categories", categories.join(","))
      }

      const response = await fetch(`${endpoints.rest}/posts?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        throw new Error(`REST API request failed: ${response.status}`)
      }

      const posts = await response.json()
      const transformedPosts = posts.map(transformRestPostToGraphQL).slice(0, limit)

      // Cache the REST API result too
      relatedPostsCache.set(postId, categories, tags, limit, transformedPosts, countryCode)

      return transformedPosts
    } catch (restError) {
      console.error("Both GraphQL and REST API failed for related posts:", restError)
      return []
    }
  }
}

/**
 * Invalidate related posts cache for a specific post
 */
export function invalidateRelatedPostsCache(postId: string): void {
  relatedPostsCache.invalidatePost(postId)
}

/**
 * Invalidate related posts cache for a specific category
 */
export function invalidateRelatedPostsCacheByCategory(categorySlug: string): void {
  relatedPostsCache.invalidateCategory(categorySlug)
}

/**
 * Get related posts cache statistics
 */
export function getRelatedPostsCacheStats() {
  return relatedPostsCache.getStats()
}

/**
 * Clear all related posts cache
 */
export function clearRelatedPostsCache(): void {
  relatedPostsCache.clear()
}

// Transform functions for REST API data
function transformRestPostToGraphQL(post: any): WordPressPost {
  return {
    id: post.id.toString(),
    title: post.title.rendered,
    content: post.content?.rendered,
    excerpt: post.excerpt.rendered,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
      ? {
          node: {
            sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
            altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
          },
        }
      : undefined,
    author: {
      node: {
        id: post._embedded?.author?.[0]?.id?.toString() || "0",
        name: post._embedded?.author?.[0]?.name || "Unknown Author",
        slug: post._embedded?.author?.[0]?.slug || "unknown-author",
        description: post._embedded?.author?.[0]?.description || "",
        avatar: {
          url: post._embedded?.author?.[0]?.avatar_urls?.["96"] || "",
        },
      },
    },
    categories: {
      nodes:
        post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
          id: cat.id.toString(),
          name: cat.name,
          slug: cat.slug,
        })) || [],
    },
    tags: {
      nodes:
        post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
          id: tag.id.toString(),
          name: tag.name,
          slug: tag.slug,
        })) || [],
    },
    seo: {
      title: post.yoast_title || post.title.rendered,
      metaDesc: post.yoast_meta?.description || post.excerpt.rendered.replace(/<[^>]*>/g, ""),
    },
  }
}

function transformRestCategoryToGraphQL(category: any): WordPressCategory {
  return {
    id: category.id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description || "",
    count: category.count,
  }
}

export async function getWordPressHealthStatus(countryCode?: string): Promise<{
  graphql: HealthCheckResult
  rest: HealthCheckResult
  circuitBreaker: { isOpen: boolean; failures: number }
}> {
  const endpoints = getCountryEndpoints(countryCode || "sz")

  const [graphqlHealth, restHealth] = await Promise.all([
    checkEndpointHealth(endpoints.graphql),
    checkEndpointHealth(endpoints.rest),
  ])

  const circuitBreakerStatus = circuitBreakers.get(endpoints.graphql) || { failures: 0, lastFailure: 0, isOpen: false }

  return {
    graphql: graphqlHealth,
    rest: restHealth,
    circuitBreaker: {
      isOpen: circuitBreakerStatus.isOpen,
      failures: circuitBreakerStatus.failures,
    },
  }
}

export function clearHealthCheckCache(): void {
  healthCheckCache.clear()
}

export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear()
}

// Export types for use in other files
export type { WordPressPost, WordPressCategory, WordPressAuthor, WordPressTag, WordPressImage, CountryConfig }

export type { Post, Category } from "@/types/content"

/**
 * Get a single post by slug for a specific country
 */
export async function getPostBySlugForCountry(countryCode: string, slug: string): Promise<WordPressPost | null> {
  return fetchWithMultipleCountryFallback(countryCode, async (country) => {
    try {
      const POST_BY_SLUG_QUERY = `
        query GetPostBySlug($slug: ID!) {
          post(id: $slug, idType: SLUG) {
            id
            title
            content
            excerpt
            slug
            date
            modified
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
            author {
              node {
                id
                name
                slug
                firstName
                lastName
                avatar {
                  url
                }
              }
            }
            categories {
              nodes {
                id
                name
                slug
              }
            }
            tags {
              nodes {
                id
                name
                slug
              }
            }
            seo {
              title
              metaDesc
              opengraphImage {
                sourceUrl
              }
            }
          }
        }
      `

      const data = await graphqlRequest<{ post: WordPressPost | null }>(POST_BY_SLUG_QUERY, { slug }, country)
      return data.post
    } catch (error) {
      console.error(`Failed to fetch post "${slug}" for ${country} via GraphQL, trying REST API:`, error)

      try {
        const posts = await restApiFallback(
          "posts",
          { slug, _embed: 1 },
          (posts: any[]) => posts.map(transformRestPostToGraphQL),
          country,
        )

        return posts.length > 0 ? posts[0] : null
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        throw restError
      }
    }
  })
}

/**
 * Get related posts for a specific country based on post slug
 */
export async function getRelatedPostsForCountry(
  countryCode: string,
  postSlug: string,
  limit = 6,
): Promise<WordPressPost[]> {
  return fetchWithMultipleCountryFallback(countryCode, async (country) => {
    try {
      // First get the post to extract its categories and tags
      const post = await getPostBySlugForCountry(country, postSlug)

      if (!post) {
        return []
      }

      const categories = post.categories?.nodes?.map((cat) => cat.id) || []
      const tags = post.tags?.nodes?.map((tag) => tag.id) || []

      // Use the existing getRelatedPosts function with country parameter
      return await getRelatedPosts(post.id, categories, tags, limit, country)
    } catch (error) {
      console.error(`Failed to fetch related posts for "${postSlug}" in ${country}:`, error)

      // Fallback: get latest posts from the same country
      try {
        const { posts } = await getLatestPostsForCountry(country, limit)
        return posts.filter((p) => p.slug !== postSlug).slice(0, limit)
      } catch (fallbackError) {
        console.error("Fallback to latest posts also failed:", fallbackError)
        return []
      }
    }
  })
}
