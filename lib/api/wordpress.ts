import {
  LATEST_POSTS_QUERY,
  POST_BY_SLUG_QUERY,
  CATEGORIES_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  FEATURED_POSTS_QUERY,
} from "@/lib/graphql/queries"
import { fetchRecentPosts, fetchCategoryPosts, fetchSinglePost } from "../wordpress"
import { relatedPostsCache } from "@/lib/cache/related-posts-cache"

const WORDPRESS_GRAPHQL_URL =
  process.env.WORDPRESS_GRAPHQL_URL ||
  "https://newsonafrica.com/sz/graphql"
const WORDPRESS_REST_URL =
  process.env.WORDPRESS_REST_URL ||
  "https://newsonafrica.com/sz/wp-json/wp/v2"

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


// Default country to use when none is specified
const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

function getCountryEndpoints() {
  return {
    graphql: WORDPRESS_GRAPHQL_URL,
    rest: WORDPRESS_REST_URL,
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

// Utility function to make GraphQL requests
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, any> = {},
  countryCode?: string,
  retries = 3,
): Promise<T> {
  const endpoints = getCountryEndpoints()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(endpoints.graphql, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      console.error("GraphQL errors:", result.errors)
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(", ")}`)
    }

    return result.data
  } catch (error) {
    clearTimeout(timeoutId)

    if (retries > 0 && error instanceof Error) {
      console.warn(`GraphQL request failed, retrying... (${retries} attempts left)`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return graphqlRequest<T>(query, variables, countryCode, retries - 1)
    }

    throw error
  }
}

// REST API fallback function
async function restApiFallback<T>(
  endpoint: string,
  params: Record<string, any> = {},
  transform: (data: any) => T,
  countryCode?: string,
): Promise<T> {
  const endpoints = getCountryEndpoints()
  const queryParams = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()

  const url = `${endpoints.rest}/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`REST API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return transform(data)
  } catch (error) {
    console.error("REST API fallback failed:", error)
    throw error
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
 * Get posts by category for a specific country
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
  try {
    const data = await graphqlRequest<{ category: any }>(
      POSTS_BY_CATEGORY_QUERY,
      {
        slug: categorySlug,
        first: limit,
        after,
      },
      countryCode,
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
    console.error(`Failed to fetch category "${categorySlug}" for ${countryCode} via GraphQL, trying REST API:`, error)

    try {
      // First get category info
      const categories = await restApiFallback(
        `categories?slug=${categorySlug}`,
        {},
        (cats: any[]) => cats,
        countryCode,
      )

      if (!categories || categories.length === 0) {
        return { category: null, posts: [], hasNextPage: false, endCursor: null }
      }

      const category = categories[0]

      // Then get posts for this category
      const posts = await restApiFallback(
        "posts",
        { categories: category.id, per_page: limit, _embed: 1 },
        (posts: any[]) => posts.map(transformRestPostToGraphQL),
        countryCode,
      )

      return {
        category: transformRestCategoryToGraphQL(category),
        posts,
        hasNextPage: posts.length === limit,
        endCursor: null,
      }
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return { category: null, posts: [], hasNextPage: false, endCursor: null }
    }
  }
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
export async function getLatestPosts(
  limit = 20,
  after?: string,
  countryCode: string = DEFAULT_COUNTRY,
) {
  try {
    const { posts, hasNextPage, endCursor } = await getLatestPostsForCountry(
      countryCode,
      limit,
      after,
    )
    return {
      posts,
      hasNextPage,
      endCursor,
      error: null,
    }
  } catch (error) {
    console.error("Failed to fetch latest posts:", error)
    return {
      posts: [],
      hasNextPage: false,
      endCursor: null,
      error: error instanceof Error ? error.message : "Failed to fetch posts",
    }
  }
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(
  slug: string,
  countryCode?: string,
): Promise<WordPressPost | null> {
  const code = countryCode || DEFAULT_COUNTRY

  try {
    const data = await graphqlRequest<WordPressSinglePostResponse>(POST_BY_SLUG_QUERY, { slug }, code)
    if (data.post) {
      return data.post
    }
  } catch (error) {
    console.error(`Failed to fetch post "${slug}" via GraphQL:`, error)
  }

  try {
    return await restApiFallback(
      `posts?slug=${slug}&_embed=1`,
      {},
      (posts: any[]) => {
        if (!posts || posts.length === 0) return null
        return transformRestPostToGraphQL(posts[0])
      },
      code,
    )
  } catch (restError) {
    console.error("Both GraphQL and REST API failed:", restError)
    return null
  }

  return null
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<WordPressCategory[]> {
  return getCategoriesForCountry()
}

/**
 * Get posts by category with caching
 */
export async function getPostsByCategory(
  categorySlug: string,
  limit = 20,
  after?: string | null,
  countryCode: string = DEFAULT_COUNTRY,
): Promise<{
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}> {
  // Create cache key
  const cacheKey = `category:${categorySlug}:${limit}:${after || "null"}`

  // Handle common slug variations (e.g. "sport" vs "sports")
  const slugAlternates: Record<string, string> = {
    sport: "sports",
    sports: "sport",
  }

  const fallbackSlug = slugAlternates[categorySlug]

  // Check cache first
  const cached = categoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Increment hit counter
    cached.hits++
    return cached.data
  }

  try {
    // If not in cache, fetch from API
    let result = await getPostsByCategoryForCountry(countryCode, categorySlug, limit, after || null)

    // Retry with fallback slug if no category returned
    if (!result.category && fallbackSlug) {
      result = await getPostsByCategoryForCountry(countryCode, fallbackSlug, limit, after || null)
    }

    // Cache the result
    categoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 1,
    })

    // Cleanup cache if needed
    cleanupCache()

    return result
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
      const endpoints = getCountryEndpoints()

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

// Export types for use in other files
export type { WordPressPost, WordPressCategory, WordPressAuthor, WordPressTag, WordPressImage }
