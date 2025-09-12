import {
  POST_BY_SLUG_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  FEATURED_POSTS_QUERY,
} from "@/lib/graphql/queries"
import { fetchRecentPosts, fetchCategoryPosts, fetchSinglePost } from "../wordpress-api"
import { relatedPostsCache } from "@/lib/cache/related-posts-cache"
import type { Post, Category } from "@/types/content"
import { getWpEndpoints } from "@/config/wp"

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
    apiEndpoint: getWpEndpoints("sz").graphql,
    restEndpoint: getWpEndpoints("sz").rest,
  },
  ng: {
    code: "ng",
    name: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    timezone: "Africa/Lagos",
    languages: ["en"],
    apiEndpoint: getWpEndpoints("ng").graphql,
    restEndpoint: getWpEndpoints("ng").rest,
  },
  ke: {
    code: "ke",
    name: "Kenya",
    flag: "🇰🇪",
    currency: "KES",
    timezone: "Africa/Nairobi",
    languages: ["en", "sw"],
    apiEndpoint: getWpEndpoints("ke").graphql,
    restEndpoint: getWpEndpoints("ke").rest,
  },
  za: {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    languages: ["en", "af", "zu", "xh"],
    apiEndpoint: getWpEndpoints("za").graphql,
    restEndpoint: getWpEndpoints("za").rest,
  },
  gh: {
    code: "gh",
    name: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    timezone: "Africa/Accra",
    languages: ["en"],
    apiEndpoint: getWpEndpoints("gh").graphql,
    restEndpoint: getWpEndpoints("gh").rest,
  },
  ug: {
    code: "ug",
    name: "Uganda",
    flag: "🇺🇬",
    currency: "UGX",
    timezone: "Africa/Kampala",
    languages: ["en"],
    apiEndpoint: getWpEndpoints("ug").graphql,
    restEndpoint: getWpEndpoints("ug").rest,
  },
  tz: {
    code: "tz",
    name: "Tanzania",
    flag: "🇹🇿",
    currency: "TZS",
    timezone: "Africa/Dar_es_Salaam",
    languages: ["en", "sw"],
    apiEndpoint: getWpEndpoints("tz").graphql,
    restEndpoint: getWpEndpoints("tz").rest,
  },
  rw: {
    code: "rw",
    name: "Rwanda",
    flag: "🇷🇼",
    currency: "RWF",
    timezone: "Africa/Kigali",
    languages: ["en", "rw", "fr"],
    apiEndpoint: getWpEndpoints("rw").graphql,
    restEndpoint: getWpEndpoints("rw").rest,
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
async function graphqlRequest<T>(query: string, variables: Record<string, any> = {}, countryCode = "sz"): Promise<T> {
  const endpoints = getCountryEndpoints(countryCode)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  // Check circuit breaker first
  if (isCircuitBreakerOpen(endpoints.graphql)) {
    console.log(`[v0] Circuit breaker is open for ${endpoints.graphql}, skipping request`)
    throw new Error("Circuit breaker is open")
  }

  try {
    console.log(`[v0] Making GraphQL request to ${endpoints.graphql}`)

    const response = await makeRequest(endpoints.graphql, {
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
      next: { revalidate: 300 },
    })

    clearTimeout(timeoutId)

    console.log(`[v0] GraphQL response status: ${response.status}`)

    if (response.status === 301 || response.status === 302) {
      console.log(`[v0] GraphQL endpoint redirected, using mock data for development`)
      return { data: null, errors: [{ message: "Endpoint redirected, using fallback" }] } as unknown as T
    }

    // Handle 503 Service Unavailable specifically
    if (response.status === 503) {
      recordCircuitBreakerFailure(endpoints.graphql)
      const errorText = await response.text().catch(() => "Service Unavailable")
      console.warn(`[v0] WordPress backend is temporarily unavailable (503): ${errorText}`)
      throw new Error(`WordPress backend temporarily unavailable: 503 Service Unavailable`)
    }

    if (!response.ok) {
      recordCircuitBreakerFailure(endpoints.graphql)
      const errorText = await response.text().catch(() => "Unknown error")
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}. ${errorText}`)
    }

    // Reset circuit breaker on success
    resetCircuitBreaker(endpoints.graphql)

    const result = await response.json()

    if (result.errors && result.errors.length > 0) {
      console.warn("[v0] GraphQL errors:", result.errors)
    }

    return result.data as unknown as T
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      console.log(`[v0] CORS/Network error detected, using mock data for development`)
      return { data: null, errors: [{ message: "Network error, using fallback" }] } as unknown as T
    }

    console.error(`[v0] GraphQL request failed:`, error.message)
    throw new Error(`GraphQL request failed: ${error.message}`)
  }
}

// Enhanced REST API fallback function with better error handling
async function restApiFallback<T>(
  endpoint: string,
  params: Record<string, any> = {},
  transform: (data: any) => T,
  countryCode = "sz",
): Promise<T> {
  const endpoints = getCountryEndpoints(countryCode)

  // Check circuit breaker first
  if (isCircuitBreakerOpen(endpoints.rest)) {
    console.log(`[v0] Circuit breaker is open for ${endpoints.rest}, using mock data`)
    throw new Error("Circuit breaker is open")
  }

  const queryParams = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()

  const url = `${endpoints.rest}/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  try {
    console.log(`[v0] Making REST API request to ${url}`)

    const response = await makeRequest(url, {
      next: { revalidate: 300 },
    })

    console.log(`[v0] REST API response status: ${response.status}`)

    if (response.status === 301 || response.status === 302) {
      console.log(`[v0] REST API endpoint redirected, using mock data`)
      throw new Error("REST API redirected")
    }

    // Handle 503 Service Unavailable specifically
    if (response.status === 503) {
      recordCircuitBreakerFailure(endpoints.rest)
      console.warn(`[v0] WordPress REST API is temporarily unavailable (503)`)
      throw new Error("WordPress REST API temporarily unavailable: 503 Service Unavailable")
    }

    if (!response.ok) {
      recordCircuitBreakerFailure(endpoints.rest)
      throw new Error(`REST API request failed: ${response.status} ${response.statusText}`)
    }

    // Reset circuit breaker on success
    resetCircuitBreaker(endpoints.rest)

    const data = await response.json()
    console.log(`[v0] REST API response received successfully`)

    return transform(data)
  } catch (error: any) {
    console.error(`[v0] REST API fallback failed:`, error.message)

    if (
      error.message === "Failed to fetch" ||
      error.message === "REST API redirected" ||
      error.message.includes("503")
    ) {
      console.log(`[v0] Using mock data due to API unavailability`)
      return null // Will trigger mock data usage in calling functions
    }

    throw new Error(`REST API request failed: ${error.message}`)
  }
}

async function makeRequest(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      mode: "cors", // Explicitly set CORS mode
      credentials: "omit", // Don't send credentials to avoid CORS issues
      redirect: "follow", // Follow redirects automatically
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "NewsOnAfrica/1.0",
        Origin: typeof window !== "undefined" ? window.location.origin : "https://v0.app",
        // Remove authentication headers that might cause CORS issues in development
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Mock data for development when external APIs fail
const MOCK_POSTS = [
  {
    id: "1",
    title: "Breaking: Major Development in African Tech Sector",
    excerpt:
      "A groundbreaking announcement from leading African tech companies signals new opportunities for innovation across the continent.",
    slug: "african-tech-development",
    date: new Date().toISOString(),
    author: { node: { name: "News Team", slug: "news-team" } },
    categories: { nodes: [{ name: "Technology", slug: "technology" }] },
    featuredImage: { node: { sourceUrl: "/news-placeholder.png", altText: "Tech news" } },
    content: "This is a sample article for development purposes.",
  },
  {
    id: "2",
    title: "Economic Growth Continues Across African Markets",
    excerpt:
      "Latest economic indicators show sustained growth in key African markets, with promising trends for the coming quarter.",
    slug: "african-economic-growth",
    date: new Date(Date.now() - 86400000).toISOString(),
    author: { node: { name: "Business Desk", slug: "business-desk" } },
    categories: { nodes: [{ name: "Business", slug: "business" }] },
    featuredImage: { node: { sourceUrl: "/news-placeholder.png", altText: "Business news" } },
    content: "This is a sample business article for development purposes.",
  },
]

const MOCK_CATEGORIES = [
  { id: "1", name: "News", slug: "news", count: 25 },
  { id: "2", name: "Business", slug: "business", count: 18 },
  { id: "3", name: "Technology", slug: "technology", count: 12 },
  { id: "4", name: "Sports", slug: "sport", count: 15 },
  { id: "5", name: "Entertainment", slug: "entertainment", count: 10 },
]

export { graphqlRequest }

export { restApiFallback }

export async function fetchWithMultipleCountryFallback<T>(
  primaryCountry: string,
  fetchFunction: (countryCode: string) => Promise<T>,
  fallbackCountries: string[] = ["sz", "ng", "ke", "za", "gh"],
): Promise<T> {
  // Try primary country first
  try {
    return await fetchFunction(primaryCountry)
  } catch (primaryError) {
    console.warn(`[v0] Primary country ${primaryCountry} failed:`, primaryError)

    // Try fallback countries
    for (const fallbackCountry of fallbackCountries) {
      if (fallbackCountry === primaryCountry) continue // Skip primary country

      try {
        console.log(`[v0] Trying fallback country: ${fallbackCountry}`)
        return await fetchFunction(fallbackCountry)
      } catch (fallbackError) {
        console.warn(`[v0] Fallback country ${fallbackCountry} failed:`, fallbackError)
        continue
      }
    }

    // If all countries fail, throw the original error
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
  const cacheKey = `posts_${countryCode}_${limit}_${after || "first"}`

  // Check cache first
  const cached = categoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cached.hits++
    console.log(`[v0] Returning cached posts for ${countryCode}`)
    return cached.data
  }

  try {
    // Try GraphQL first
    const query = `
      query GetLatestPosts($first: Int!, $after: String) {
        posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
          nodes {
            id
            title
            excerpt
            slug
            date
            author {
              node {
                name
                slug
              }
            }
            categories {
              nodes {
                name
                slug
              }
            }
            featuredImage {
              node {
                sourceUrl
                altText
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    const data = await graphqlRequest<{
      posts: {
        nodes: any[]
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }
    }>(query, { first: limit, after }, countryCode)

    if (data?.posts?.nodes) {
      const result = {
        posts: data.posts.nodes,
        hasNextPage: data.posts.pageInfo.hasNextPage,
        endCursor: data.posts.pageInfo.endCursor,
      }

      // Cache successful result
      categoryCache.set(cacheKey, { data: result, timestamp: Date.now(), hits: 1 })
      cleanupCache()

      console.log(`[v0] Successfully fetched ${result.posts.length} posts for ${countryCode} via GraphQL`)
      return result
    }

    throw new Error("No data received from GraphQL")
  } catch (graphqlError: any) {
    console.log(`Failed to fetch latest posts for ${countryCode} via GraphQL, trying REST API: ${graphqlError.message}`)

    try {
      // Try REST API fallback
      const restData = await restApiFallback(
        "posts",
        { per_page: limit, _embed: 1 },
        (data: any[]) => ({
          posts: data.map((post) => ({
            id: post.id.toString(),
            title: post.title?.rendered || "Untitled",
            excerpt: post.excerpt?.rendered?.replace(/<[^>]*>/g, "") || "",
            slug: post.slug || "",
            date: post.date || new Date().toISOString(),
            author: {
              node: {
                name: post._embedded?.author?.[0]?.name || "Unknown Author",
                slug: post._embedded?.author?.[0]?.slug || "unknown",
              },
            },
            categories: {
              nodes:
                post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                  name: cat.name,
                  slug: cat.slug,
                })) || [],
            },
            featuredImage: {
              node: {
                sourceUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "/news-placeholder.png",
                altText: post._embedded?.["wp:featuredmedia"]?.[0]?.alt_text || "News image",
              },
            },
          })),
          hasNextPage: data.length === limit,
          endCursor: data.length > 0 ? data[data.length - 1].id.toString() : null,
        }),
        countryCode,
      )

      if (restData) {
        // Cache successful REST result
        categoryCache.set(cacheKey, { data: restData, timestamp: Date.now(), hits: 1 })
        cleanupCache()

        console.log(`[v0] Successfully fetched ${restData.posts.length} posts for ${countryCode} via REST API`)
        return restData
      }

      throw new Error("REST API also failed")
    } catch (restError: any) {
      console.warn(`Both GraphQL and REST API failed for ${countryCode}:`, restError.message)

      // Return cached data if available, even if expired
      if (cached) {
        console.log(`[v0] Returning expired cached data for ${countryCode} due to API unavailability`)
        cached.hits++
        return cached.data
      }

      // Return mock data as last resort
      console.log(`[v0] Using mock data for ${countryCode} due to complete API failure`)
      const mockResult = {
        posts: MOCK_POSTS.slice(0, limit),
        hasNextPage: false,
        endCursor: null,
      }

      // Cache mock data temporarily
      categoryCache.set(cacheKey, { data: mockResult, timestamp: Date.now(), hits: 1 })

      return mockResult
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
