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
const WORDPRESS_REST_API_URL = "https://newsonafrica.com/sz/wp-json/wp/v2"

if (!WORDPRESS_API_URL) {
  console.error("NEXT_PUBLIC_WORDPRESS_API_URL is not set in the environment variables.")
}

// Create a client with a timeout
export const client = new GraphQLClient(WORDPRESS_API_URL, {
  timeout: 15000, // 15 second timeout
  errorPolicy: "all",
})

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

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
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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
  if (!isOnline()) {
    console.log("Device is offline, skipping API request")
    throw new Error("Device is offline")
  }

  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

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
          error.message.includes("aborted"))

      if (isNetworkError && attempt === maxRetries - 1) {
        // If we've exhausted GraphQL retries, try REST API as last resort
        console.log("Falling back to REST API...")
        // We'll handle the fallback in the specific functions
        throw new Error("GraphQL failed, try REST API")
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
 * @param {number} [limit=5] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchTaggedPosts = cache(async (tag: string, limit = 5) => {
  try {
    const data = await fetchWithRetry(queries.taggedPosts, { tag, limit })
    return data.posts.nodes
  } catch (error) {
    console.log("Falling back to REST API for tagged posts")
    try {
      // Fallback to REST API
      const posts = await fetchFromRestApi("posts", {
        tags: tag,
        per_page: limit,
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
  }
})

/**
 * Fetches featured posts.
 *
 * @param {number} [limit=5] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchFeaturedPosts = cache(async (limit = 5) => {
  try {
    const data = await fetchWithRetry(queries.featuredPosts)
    return data.posts.nodes
  } catch (error) {
    console.log("Falling back to REST API for featured posts")
    try {
      // Fallback to REST API - using sticky posts as featured
      const posts = await fetchFromRestApi("posts", {
        sticky: true,
        per_page: limit,
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
  }
})

/**
 * Fetches posts by category.
 *
 * @param {string} slug - The category slug to fetch posts for.
 * @param {number} [limit=5] - The number of posts to fetch.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the category data.
 */
export const fetchCategoryPosts = cache(async (slug: string, limit = 5, after: string | null = null) => {
  try {
    const data = await fetchWithRetry(queries.categoryPosts, { slug, after })
    return data.category
  } catch (error) {
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
        per_page: limit,
        _embed: 1,
      })

      // Transform REST API response to match GraphQL structure
      return {
        name: categories[0].name,
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
    } catch (restError) {
      console.error(`Both GraphQL and REST API failed for category ${slug}:`, restError)
      return { name: slug, posts: { nodes: [] } } // Return empty structure as last resort
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
    console.log("Falling back to REST API for categorized posts")
    try {
      // Get all categories
      const categories = await fetchFromRestApi("categories", { per_page: 100 })

      // For each category, get its posts
      const categoriesWithPosts = await Promise.all(
        categories.map(async (category: any) => {
          const posts = await fetchFromRestApi("posts", {
            categories: category.id,
            per_page: 5,
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
  }
})

/**
 * Fetches recent posts.
 *
 * @param {number} [limit=10] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchRecentPosts = cache(async (limit = 10) => {
  try {
    const data = await fetchWithRetry(queries.recentPosts, { limit })
    return data.posts.nodes
  } catch (error) {
    console.log("Falling back to REST API for recent posts")
    try {
      const posts = await fetchFromRestApi("posts", {
        per_page: limit,
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
  }
})

/**
 * Fetches all authors.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of authors.
 */
export const fetchAllAuthors = async () => fetchWithRetry(queries.allAuthors).then((data: any) => data.users.nodes)

/**
 * Fetches all posts.
 *
 * @param {number} [limit=1000] - The number of posts to fetch.
 * @returns {Promise<any[]>} - A promise that resolves with an array of posts.
 */
export const fetchAllPosts = cache(async (limit = 1000) =>
  fetchWithRetry(queries.allPosts, { limit }).then((data: any) => data.posts.nodes),
)

/**
 * Fetches all tags.
 *
 * @returns {Promise<any[]>} - A promise that resolves with an array of tags.
 */
export const fetchAllTags = cache(async () => fetchWithRetry(queries.allTags).then((data: any) => data.tags.nodes))

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
 * @param {string | null} [category=null] - Optional category to filter by.
 * @param {string | null} [after=null] - The cursor to fetch posts after.
 * @returns {Promise<any>} - A promise that resolves with the search results.
 */
export const searchPosts = async (query: string, category: string | null = null, after: string | null = null) => {
  try {
    // Use the appropriate query based on whether a category is provided
    const queryToUse = category ? queries.searchPostsWithCategory : queries.searchPosts
    const variables = category ? { query, category, after } : { query, after }

    const data = await fetchWithRetry(queryToUse, variables)
    return data.posts
  } catch (error) {
    console.error("Error searching posts:", error)

    // Try REST API as fallback
    try {
      console.log("Falling back to REST API for search")
      const params: Record<string, any> = {
        search: query,
        _embed: 1,
      }

      if (category) {
        // First get the category ID from the slug
        const categories = await fetchFromRestApi("categories", { slug: category })
        if (categories && categories.length > 0) {
          params.categories = categories[0].id
        }
      }

      const posts = await fetchFromRestApi("posts", params)

      // Transform to match GraphQL structure
      return {
        nodes: posts.map((post: any) => ({
          id: post.id,
          title: post.title.rendered,
          excerpt: post.excerpt.rendered,
          slug: post.slug,
          date: post.date,
          featuredImage: post._embedded?.["wp:featuredmedia"]
            ? {
                sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
                altText: post._embedded["wp:featuredmedia"][0].alt_text || "",
              }
            : null,
          author: {
            name: post._embedded?.["author"]?.[0]?.name || "Unknown Author",
            slug: post._embedded?.["author"]?.[0]?.slug || "unknown-author",
          },
          categories:
            post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
              name: cat.name,
              slug: cat.slug,
            })) || [],
          tags:
            post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
              name: tag.name,
              slug: tag.slug,
            })) || [],
        })),
      }
    } catch (restError) {
      console.error("Both GraphQL and REST API failed for search:", restError)
      return { nodes: [] } // Return empty structure as last resort
    }
  }
}

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
export const fetchAuthorData = async (slug: string, after: string | null = null) =>
  fetchWithRetry(queries.authorData, { slug, after }).then((data: any) => data.user)

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
export const fetchPostsByTag = async (tag: string, after: string | null = null) =>
  fetchWithRetry(queries.postsByTag, { tag, after }).then((data: any) => data.posts)

/**
 * Fetches a single tag.
 *
 * @param {string} slug - The tag slug.
 * @returns {Promise<any>} - A promise that resolves with the tag data.
 */
export const fetchSingleTag = async (slug: string) =>
  fetchWithRetry(queries.singleTag, { slug }).then((data: any) => data.tag)

/**
 * Fetches a single category.
 *
 * @param {string} slug - The category slug.
 * @returns {Promise<any>} - A promise that resolves with the category data.
 */
export const fetchSingleCategory = async (slug: string) =>
  fetchWithRetry(queries.singleCategory, { slug }).then((data: any) => data.category)

// Add the missing functions that are causing import errors
/**
 * Fetches all posts for the sitemap.
 * This is an alias for fetchAllPosts with a more descriptive name.
 *
 * @param {number} [limit=1000] - The number of posts to fetch.
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
