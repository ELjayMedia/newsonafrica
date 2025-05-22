/**
 * WordPress API Utilities
 *
 * This module provides functions for interacting with the WordPress REST API.
 * It handles fetching posts, categories, tags, and other content from WordPress.
 */

import { GraphQLClient } from "graphql-request"
import { queries, mutations } from "./wordpress-queries"
import { cache } from "react"

const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://newsonafrica.com/sz/graphql"
const WORDPRESS_REST_API_URL = process.env.WORDPRESS_REST_API_URL || "https://newsonafrica.com/sz/wp-json/wp/v2"

if (!WORDPRESS_API_URL) {
  console.error("NEXT_PUBLIC_WORDPRESS_API_URL is not set in the environment variables.")
}

// Create a client with a timeout
export const client = new GraphQLClient(WORDPRESS_API_URL, {
  timeout: 30000, // Increased timeout to 30 seconds
  errorPolicy: "all",
})

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Check if we're in a server environment
const isServer = () => typeof window === "undefined"

/**
 * Fetches data from the WordPress REST API with retry logic.
 *
 * @param {string} endpoint - The REST API endpoint to fetch from.
 * @param {Record<string, any>} [params={}] - Optional parameters to include in the request.
 * @returns {Promise<any>} - A promise that resolves with the JSON response from the API.
 */
const fetchFromRestApi = async (endpoint: string, params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()

  const url = `${WORDPRESS_REST_API_URL}/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  // Implement retry logic with exponential backoff
  const MAX_RETRIES = 3
  let lastError

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // Increased timeout to 30 seconds

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        next: { revalidate: 60 }, // Revalidate every 60 seconds
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`REST API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      // If it's the last attempt, throw the error
      if (attempt === MAX_RETRIES - 1) {
        throw error
      }

      // Exponential backoff before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000)
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
    }
  }

  throw lastError
}

/**
 * Fetches data from the GraphQL API with retry logic and REST API fallback.
 *
 * @param {string} query - The GraphQL query to execute.
 * @param {Record<string, any>} [variables={}] - Optional variables to include in the query.
 * @param {number} [maxRetries=3] - The maximum number of retries.
 * @param {Record<string, string>} [headers={}] - Optional headers to include in the request.
 * @returns {Promise<any>} - A promise that resolves with the JSON response from the API.
 */
const fetchWithRetry = async (query: string, variables = {}, maxRetries = 3, headers: Record<string, string> = {}) => {
  // If we're offline, don't even try to fetch
  if (!isServer() && !isOnline()) {
    console.log("Device is offline, skipping API request")
    throw new Error("Device is offline")
  }

  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // Increased timeout to 30 seconds

      // Skip the GraphQL endpoint test - it's causing issues
      // Instead, directly try the GraphQL request and handle any failures
      const response = await client.request(query, variables, {
        ...headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      console.error(`GraphQL API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      // Check if it's a network error or timeout
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("Network request failed") ||
          error.message.includes("aborted") ||
          error.message.includes("GraphQL endpoint"))

      if (isNetworkError) {
        console.log("Network error detected, trying REST API fallback...")
        // Signal that we should use the REST API fallback
        throw new Error("USE_REST_FALLBACK")
      }

      if (attempt === maxRetries - 1) throw error

      // Exponential backoff before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000)
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
    }
  }
  throw lastError
}

/**
 * Fetches posts with a specific tag.
 *
 * @param {string} tag - The tag slug to fetch posts for.
 * @param {number} [limit=100] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchTaggedPosts = cache(async (tag: string, limit = 100) => {
  try {
    // If we're offline, return empty array
    if (!isServer() && !isOnline()) {
      console.log("Device is offline, returning empty array for tagged posts")
      return []
    }

    const data = await fetchWithRetry(queries.taggedPosts, { tag, limit })
    return data.posts.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for tagged posts")
      try {
        // Fallback to REST API
        const posts = await fetchFromRestApi("posts", {
          tags: tag,
          per_page: 100, // Increased to maximum allowed by WordPress REST API
          _embed: 1,
        })

        // Transform REST API response to match GraphQL structure
        return posts.map((post: any) => ({
          id: post.id,
          title: post.title.rendered,
          excerpt: post.excerpt.rendered,
          slug: post.slug,
          date: post.date,
          featuredImage: post._embedded?.["wp:featuredmedia"]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                },
              }
            : null,
          author: post._embedded?.["author"]
            ? {
                node: {
                  name: post._embedded["author"][0].name,
                  slug: post._embedded["author"][0].slug,
                },
              }
            : null,
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches featured posts.
 *
 * @param {number} [limit=100] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchFeaturedPosts = cache(async (limit = 100) => {
  try {
    // If we're offline, return empty array
    if (!isServer() && !isOnline()) {
      console.log("Device is offline, returning empty array for featured posts")
      return []
    }

    const data = await fetchWithRetry(queries.featuredPosts, { limit })
    return data.posts.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for featured posts")
      try {
        // Fallback to REST API - using sticky posts as featured
        const posts = await fetchFromRestApi("posts", {
          sticky: true,
          per_page: 100, // Increased to maximum allowed by WordPress REST API
          _embed: 1,
        })

        // Transform REST API response to match GraphQL structure
        return posts.map((post: any) => ({
          id: post.id,
          title: post.title.rendered,
          excerpt: post.excerpt.rendered,
          slug: post.slug,
          date: post.date,
          featuredImage: post._embedded?.["wp:featuredmedia"]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                },
              }
            : null,
          author: post._embedded?.["author"]
            ? {
                node: {
                  name: post._embedded["author"][0].name,
                  slug: post._embedded["author"][0].slug,
                },
              }
            : null,
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches posts by category.
 *
 * @param {string} slug - The category slug to fetch posts for.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the category data.
 */
export const fetchCategoryPosts = cache(async (slug: string, after: string | null = null) => {
  try {
    // Modify the GraphQL query to request more posts (first: 100)
    const data = await fetchWithRetry(queries.categoryPosts, { slug, after, first: 100 })
    return data.category
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "USE_REST_FALLBACK" || error.message.includes("Failed to fetch"))
    ) {
      console.log(`Falling back to REST API for category: ${slug}`)
      try {
        // First get the category ID from the slug
        const categories = await fetchFromRestApi("categories", { slug })
        if (!categories || categories.length === 0) {
          throw new Error(`Category not found: ${slug}`)
        }

        const categoryId = categories[0].id

        // Then get posts from that category
        const posts = await fetchFromRestApi("posts", {
          categories: categoryId,
          per_page: 100, // Increased to maximum allowed by WordPress REST API
          _embed: 1,
        })

        // Transform REST API response to match GraphQL structure
        return {
          name: categories[0].name,
          description: categories[0].description || "",
          posts: {
            pageInfo: {
              hasNextPage: posts.length >= 100, // Assume there are more if we got a full page
              endCursor: null, // REST API doesn't use cursors
            },
            nodes: posts.map((post: any) => ({
              id: post.id,
              title: post.title.rendered,
              excerpt: post.excerpt.rendered,
              slug: post.slug,
              date: post.date,
              featuredImage: post._embedded?.["wp:featuredmedia"]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : null,
              author: post._embedded?.["author"]
                ? {
                    node: {
                      name: post._embedded["author"][0].name,
                      slug: post._embedded["author"][0].slug,
                    },
                  }
                : null,
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
              tags: {
                nodes:
                  post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                    name: tag.name,
                    slug: tag.slug,
                  })) || [],
              },
            })),
          },
        }
      } catch (restError) {
        console.error(`Both GraphQL and REST API failed for category ${slug}:`, restError)
        // Return a minimal valid structure to prevent UI crashes
        return {
          name: slug,
          description: "",
          posts: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        }
      }
    } else {
      console.error(`GraphQL API failed for category ${slug} with non-network error:`, error)
      // Return a minimal valid structure to prevent UI crashes
      return {
        name: slug,
        description: "",
        posts: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        },
      }
    }
  }
})

/**
 * Fetches all categories with their posts.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of categories with posts.
 */
export const fetchCategorizedPosts = cache(async () => {
  try {
    // Modify the GraphQL query to request more posts per category (first: 100)
    const data = await fetchWithRetry(queries.categorizedPosts)

    // Ensure we have valid category data
    if (!data?.categories?.nodes || !Array.isArray(data.categories.nodes)) {
      console.error("Invalid category data structure:", data)
      return []
    }

    // Filter out categories with no posts
    const categoriesWithPosts = data.categories.nodes.filter(
      (category) => category?.posts?.nodes && category.posts.nodes.length > 0,
    )

    return categoriesWithPosts
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for categorized posts")
      try {
        // Get all categories
        const categories = await fetchFromRestApi("categories", { per_page: 100 })

        // For each category, get its posts
        const categoriesWithPosts = await Promise.all(
          categories.map(async (category: any) => {
            const posts = await fetchFromRestApi("posts", {
              categories: category.id,
              per_page: 100, // Increased to maximum allowed by WordPress REST API
              _embed: 1,
            })

            return {
              id: category.id,
              name: category.name,
              slug: category.slug,
              parent: category.parent
                ? {
                    node: {
                      name: categories.find((c: any) => c.id === category.parent)?.name || "",
                    },
                  }
                : null,
              posts: {
                nodes: posts.map((post: any) => ({
                  id: post.id,
                  title: post.title.rendered,
                  excerpt: post.excerpt.rendered,
                  slug: post.slug,
                  date: post.date,
                  featuredImage: post._embedded?.["wp:featuredmedia"]
                    ? {
                        node: {
                          sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                        },
                      }
                    : null,
                  author: post._embedded?.["author"]
                    ? {
                        node: {
                          name: post._embedded["author"][0].name,
                          slug: post._embedded["author"][0].slug,
                        },
                      }
                    : null,
                  categories: {
                    nodes:
                      post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                        name: cat.name,
                        slug: cat.slug,
                      })) || [],
                  },
                  tags: {
                    nodes:
                      post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                        name: tag.name,
                        slug: tag.slug,
                      })) || [],
                  },
                })),
              },
            }
          }),
        )

        // Filter out categories with no posts
        return categoriesWithPosts.filter((category) => category?.posts?.nodes && category.posts.nodes.length > 0)
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches recent posts.
 *
 * @param {number} [limit=100] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchRecentPosts = cache(async (limit = 100) => {
  try {
    const data = await fetchWithRetry(queries.recentPosts, { limit })
    return data.posts.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for recent posts")
      try {
        const posts = await fetchFromRestApi("posts", {
          per_page: 100, // Increased to maximum allowed by WordPress REST API
          _embed: 1,
        })

        // Transform REST API response to match GraphQL structure
        return posts.map((post: any) => ({
          id: post.id,
          title: post.title.rendered,
          excerpt: post.excerpt.rendered,
          slug: post.slug,
          date: post.date,
          featuredImage: post._embedded?.["wp:featuredmedia"]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                },
              }
            : null,
          author: post._embedded?.["author"]
            ? {
                node: {
                  name: post._embedded["author"][0].name,
                  slug: post._embedded["author"][0].slug,
                },
              }
            : null,
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches all categories.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of categories.
 */
export const fetchAllCategories = cache(async () => {
  try {
    const data = await fetchWithRetry(queries.allCategories)
    return data.categories.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for all categories")
      try {
        const categories = await fetchFromRestApi("categories", { per_page: 100 })
        return categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches all authors.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of authors.
 */
export const fetchAllAuthors = async () => {
  try {
    const data = await fetchWithRetry(queries.allAuthors)
    return data.users.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for all authors")
      try {
        const authors = await fetchFromRestApi("users", { per_page: 100 })
        return authors.map((author: any) => ({
          id: author.id,
          name: author.name,
          slug: author.slug,
          description: author.description || "",
          avatar: {
            url: author.avatar_urls["96"] || "",
          },
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
}

/**
 * Fetches all posts.
 *
 * @param {number} [limit=10000] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchAllPosts = cache(async (limit = 10000) => {
  try {
    // For GraphQL, we'll use pagination to fetch all posts
    let allPosts: any[] = []
    let hasNextPage = true
    let endCursor: string | null = null

    while (hasNextPage && allPosts.length < limit) {
      const data = await fetchWithRetry(queries.allPosts, {
        first: 100, // Fetch 100 posts at a time (GraphQL maximum)
        after: endCursor,
      })

      if (data?.posts?.nodes) {
        allPosts = [...allPosts, ...data.posts.nodes]
        hasNextPage = data.posts.pageInfo?.hasNextPage || false
        endCursor = data.posts.pageInfo?.endCursor || null
      } else {
        hasNextPage = false
      }

      // Break if we've reached the limit
      if (allPosts.length >= limit) {
        break
      }
    }

    return allPosts
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for all posts")
      try {
        // REST API has pagination limits, so we'll need to make multiple requests
        const MAX_PER_PAGE = 100 // WordPress REST API maximum
        let allPosts: any[] = []
        let page = 1
        let shouldContinue = true

        while (shouldContinue && allPosts.length < limit) {
          const posts = await fetchFromRestApi("posts", {
            per_page: MAX_PER_PAGE,
            page,
            _embed: 1,
          })

          if (posts.length === 0) {
            shouldContinue = false
          } else {
            allPosts = [...allPosts, ...posts]
            page++

            // Break if we've reached the limit or if we got fewer posts than requested (last page)
            if (allPosts.length >= limit || posts.length < MAX_PER_PAGE) {
              shouldContinue = false
            }
          }
        }

        // Transform REST API response to match GraphQL structure
        return allPosts.slice(0, limit).map((post: any) => ({
          id: post.id,
          title: post.title.rendered,
          excerpt: post.excerpt.rendered,
          slug: post.slug,
          date: post.date,
          featuredImage: post._embedded?.["wp:featuredmedia"]
            ? {
                node: {
                  sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                },
              }
            : null,
          author: post._embedded?.["author"]
            ? {
                node: {
                  name: post._embedded["author"][0].name,
                  slug: post._embedded["author"][0].slug,
                },
              }
            : null,
          categories: {
            nodes:
              post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                name: cat.name,
                slug: cat.slug,
              })) || [],
          },
          tags: {
            nodes:
              post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                name: tag.name,
                slug: tag.slug,
              })) || [],
          },
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches all tags.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of tags.
 */
export const fetchAllTags = cache(async () => {
  try {
    const data = await fetchWithRetry(queries.allTags)
    return data.tags.nodes
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for all tags")
      try {
        // Fetch all tags with pagination
        const MAX_PER_PAGE = 100 // WordPress REST API maximum
        let allTags: any[] = []
        let page = 1
        let shouldContinue = true

        while (shouldContinue) {
          const tags = await fetchFromRestApi("tags", {
            per_page: MAX_PER_PAGE,
            page,
          })

          if (tags.length === 0) {
            shouldContinue = false
          } else {
            allTags = [...allTags, ...tags]
            page++

            // Break if we got fewer tags than requested (last page)
            if (tags.length < MAX_PER_PAGE) {
              shouldContinue = false
            }
          }
        }

        return allTags.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        }))
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return [] // Return empty array as last resort
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return [] // Return empty array for other errors
    }
  }
})

/**
 * Fetches pending comments.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of pending comments.
 */
export const fetchPendingComments = async () =>
  fetchWithRetry(queries.pendingComments).then((data: any) => data.comments.nodes)

/**
 * Approves a comment.
 *
 * @param {string} id - The ID of the comment to approve.
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating success.
 */
export const approveComment = async (id: string) =>
  fetchWithRetry(mutations.approveComment, { id }).then((data: any) => data.updateComment.success)

/**
 * Deletes a comment.
 *
 * @param {string} id - The ID of the comment to delete.
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating success.
 */
export const deleteComment = async (id: string) =>
  fetchWithRetry(mutations.deleteComment, { id }).then((data: any) => data.deleteComment.success)

/**
 * Fetches comments for a post.
 *
 * @param {number} postId - The ID of the post to fetch comments for.
 * @returns {Promise<any[]>} - A promise that resolves with an array of comments.
 */
export const fetchComments = async (postId: number) =>
  fetchWithRetry(queries.postComments, { postId }).then((data: any) => data.comments.nodes)

/**
 * Posts a comment.
 *
 * @param {any} commentData - The comment data.
 * @returns {Promise<any>} - A promise that resolves with the created comment data.
 */
export const postComment = async (commentData: any) =>
  fetchWithRetry(mutations.createComment, { input: commentData }).then((data: any) => data.createComment)

/**
 * Searches posts.
 *
 * @param {string} query - The search query.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the search results.
 */
export const searchPosts = async (query: string, after: string | null = null) =>
  fetchWithRetry(queries.searchPosts, { query, after, first: 100 }).then((data: any) => data.posts)

/**
 * Fetches business posts.
 *
 * @returns {Promise<any>} - A promise that resolves with the business posts.
 */
export const fetchBusinessPosts = async () => fetchCategoryPosts("business")

/**
 * Fetches news posts.
 *
 * @returns {Promise<any>} - A promise that resolves with the news posts.
 */
export const fetchNewsPosts = async () => fetchCategoryPosts("news")

/**
 * Fetches author data.
 *
 * @param {string} slug - The author slug.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the author data.
 */
export const fetchAuthorData = async (slug: string, after: string | null = null) => {
  try {
    const data = await fetchWithRetry(queries.authorData, { slug, after, first: 100 })
    return data.user
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log(`Falling back to REST API for author: ${slug}`)
      try {
        // First get the author data
        const authors = await fetchFromRestApi(`users?slug=${slug}`)
        if (!authors || authors.length === 0) {
          throw new Error(`Author not found: ${slug}`)
        }

        const author = authors[0]

        // Then get posts by this author with pagination
        const MAX_PER_PAGE = 100 // WordPress REST API maximum
        let allPosts: any[] = []
        let page = 1
        let shouldContinue = true

        while (shouldContinue) {
          const posts = await fetchFromRestApi("posts", {
            author: author.id,
            per_page: MAX_PER_PAGE,
            page,
            _embed: 1,
          })

          if (posts.length === 0) {
            shouldContinue = false
          } else {
            allPosts = [...allPosts, ...posts]
            page++

            // Break if we got fewer posts than requested (last page)
            if (posts.length < MAX_PER_PAGE) {
              shouldContinue = false
            }
          }
        }

        // Transform REST API response to match GraphQL structure
        return {
          id: author.id,
          name: author.name,
          slug: author.slug,
          description: author.description || "",
          avatar: {
            url: author.avatar_urls["96"] || "",
          },
          posts: {
            pageInfo: {
              hasNextPage: false, // We've fetched all posts
              endCursor: null,
            },
            nodes: allPosts.map((post: any) => ({
              id: post.id,
              title: post.title.rendered,
              excerpt: post.excerpt.rendered,
              slug: post.slug,
              date: post.date,
              featuredImage: post._embedded?.["wp:featuredmedia"]
                ? {
                    node: {
                      sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                      altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                    },
                  }
                : null,
              author: {
                node: {
                  name: author.name,
                  slug: author.slug,
                },
              },
              categories: {
                nodes:
                  post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                    name: cat.name,
                    slug: cat.slug,
                  })) || [],
              },
              tags: {
                nodes:
                  post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                    name: tag.name,
                    slug: tag.slug,
                  })) || [],
              },
            })),
          },
        }
      } catch (restError) {
        console.error(`Both GraphQL and REST API failed for author ${slug}:`, restError)
        throw new Error(
          `Failed to fetch author data: ${restError instanceof Error ? restError.message : "Unknown error"}`,
        )
      }
    } else {
      console.error(`GraphQL API failed for author ${slug} with non-network error:`, error)
      throw error
    }
  }
}

/**
 * Fetches a single post.
 *
 * @param {string} slug - The post slug.
 * @returns {Promise<any>} - A promise that resolves with the post data.
 */
export const fetchSinglePost = async (slug: string) => {
  try {
    const data = await fetchWithRetry(queries.singlePost, { slug })
    return data.post
  } catch (error) {
    console.error(`Error fetching post with slug ${slug}:`, error)

    // Try REST API as fallback
    try {
      console.log(`Falling back to REST API for post with slug ${slug}`)
      const posts = await fetchFromRestApi(`posts?slug=${slug}&_embed=1`)

      if (!posts || posts.length === 0) {
        return null
      }

      const post = posts[0]

      // Transform REST API response to match GraphQL structure
      return {
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        slug: post.slug,
        date: post.date,
        modified: post.modified,
        featuredImage: post._embedded?.["wp:featuredmedia"]
          ? {
              node: {
                sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
              },
            }
          : null,
        author: {
          node: {
            name: post._embedded?.["author"]?.[0]?.name || "Unknown Author",
            slug: post._embedded?.["author"]?.[0]?.slug || "unknown-author",
          },
        },
        categories: {
          nodes:
            post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
              name: cat.name,
              slug: cat.slug,
            })) || [],
        },
        tags: {
          nodes:
            post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
              name: tag.name,
              slug: tag.slug,
            })) || [],
        },
        seo: {
          title: post.yoast_title || post.title.rendered,
          metaDesc: post.yoast_meta?.description || post.excerpt.rendered.replace(/<[^>]*>/g, ""),
        },
      }
    } catch (restError) {
      console.error(`Both GraphQL and REST API failed for post ${slug}:`, restError)
      return null
    }
  }
}

/**
 * Fetches the user profile.
 *
 * @param {string} token - The user token.
 * @returns {Promise<any>} - A promise that resolves with the user profile data.
 */
export const fetchUserProfile = async (token: string) =>
  fetchWithRetry(queries.currentUser, {}, 1, { Authorization: `Bearer ${token}` }).then((data: any) => data.viewer)

/**
 * Updates the user profile.
 *
 * @param {string} token - The user token.
 * @param {any} userData - The user data to update.
 * @returns {Promise<any>} - A promise that resolves with the updated user data.
 */
export const updateUserProfile = async (token: string, userData: any) =>
  fetchWithRetry(mutations.updateUser, { input: userData }, 1, { Authorization: `Bearer ${token}` }).then(
    (data: any) => data.updateUser.user,
  )

/**
 * Fetches posts by tag.
 *
 * @param {string} tag - The tag slug.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the posts data.
 */
export const fetchPostsByTag = async (tag: string, after: string | null = null) => {
  try {
    const data = await fetchWithRetry(queries.postsByTag, { tag, after, first: 100 })
    return data.posts
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for posts by tag")
      try {
        // Get tag ID first
        const tags = await fetchFromRestApi("tags", { slug: tag })
        if (!tags || tags.length === 0) {
          throw new Error(`Tag not found: ${tag}`)
        }

        const tagId = tags[0].id

        // Fetch all posts with this tag using pagination
        const MAX_PER_PAGE = 100 // WordPress REST API maximum
        let allPosts: any[] = []
        let page = 1
        let shouldContinue = true

        while (shouldContinue) {
          const posts = await fetchFromRestApi("posts", {
            tags: tagId,
            per_page: MAX_PER_PAGE,
            page,
            _embed: 1,
          })

          if (posts.length === 0) {
            shouldContinue = false
          } else {
            allPosts = [...allPosts, ...posts]
            page++

            // Break if we got fewer posts than requested (last page)
            if (posts.length < MAX_PER_PAGE) {
              shouldContinue = false
            }
          }
        }

        // Transform REST API response to match GraphQL structure
        return {
          pageInfo: {
            hasNextPage: false, // We've fetched all posts
            endCursor: null,
          },
          nodes: allPosts.map((post: any) => ({
            id: post.id,
            title: post.title.rendered,
            excerpt: post.excerpt.rendered,
            slug: post.slug,
            date: post.date,
            featuredImage: post._embedded?.["wp:featuredmedia"]
              ? {
                  node: {
                    sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                    altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
                  },
                }
              : null,
            author: post._embedded?.["author"]
              ? {
                  node: {
                    name: post._embedded["author"][0].name,
                    slug: post._embedded["author"][0].slug,
                  },
                }
              : null,
            categories: {
              nodes:
                post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
                  name: cat.name,
                  slug: cat.slug,
                })) || [],
            },
            tags: {
              nodes:
                post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
                  name: tag.name,
                  slug: tag.slug,
                })) || [],
            },
          })),
        }
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        // Return a minimal valid structure to prevent UI crashes
        return {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        }
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      // Return a minimal valid structure to prevent UI crashes
      return {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [],
      }
    }
  }
}

/**
 * Fetches a single tag.
 *
 * @param {string} slug - The tag slug.
 * @returns {Promise<any>} - A promise that resolves with the tag data.
 */
export const fetchSingleTag = async (slug: string) => {
  try {
    const data = await fetchWithRetry(queries.singleTag, { slug })
    return data.tag
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for single tag")
      try {
        const tags = await fetchFromRestApi("tags", { slug })
        if (!tags || tags.length === 0) {
          return null
        }
        const tag = tags[0]
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description || "",
        }
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return null
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return null
    }
  }
}

/**
 * Fetches a single category.
 *
 * @param {string} slug - The category slug.
 * @returns {Promise<any>} - A promise that resolves with the category data.
 */
export const fetchSingleCategory = async (slug: string) => {
  try {
    const data = await fetchWithRetry(queries.singleCategory, { slug })
    return data.category
  } catch (error) {
    if (error instanceof Error && error.message === "USE_REST_FALLBACK") {
      console.log("Falling back to REST API for single category")
      try {
        const categories = await fetchFromRestApi("categories", { slug })
        if (!categories || categories.length === 0) {
          return null
        }
        const category = categories[0]
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || "",
        }
      } catch (restError) {
        console.error("Both GraphQL and REST API failed:", restError)
        return null
      }
    } else {
      console.error("GraphQL API failed with non-network error:", error)
      return null
    }
  }
}

// Add the missing functions that are causing import errors
/**
 * Fetches all posts for the sitemap.
 * This is an alias for fetchAllPosts with a more descriptive name.
 *
 * @param {number} [limit=10000] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchPosts = fetchAllPosts

/**
 * Fetches all categories for the sitemap.
 * This is an alias for fetchAllCategories with a more descriptive name.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of categories.
 */
export const fetchCategories = fetchAllCategories

/**
 * Fetches all tags for the sitemap.
 * This is an alias for fetchAllTags with a more descriptive name.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of tags.
 */
export const fetchTags = fetchAllTags

/**
 * Fetches all authors for the sitemap.
 * This is an alias for fetchAllAuthors with a more descriptive name.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of authors.
 */
export const fetchAuthors = fetchAllAuthors

export interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  modified: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText: string
    }
  }
  author: {
    node: {
      name: string
      slug: string
      description: string
      avatar: {
        url: string
      }
    }
  }
  categories: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  tags: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  seo?: {
    title: string
    metaDesc: string
    opengraphImage?: {
      sourceUrl: string
    }
  }
  content?: string
}
