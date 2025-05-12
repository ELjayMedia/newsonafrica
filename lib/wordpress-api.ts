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

// Replace the entire fetchFromRestApi function with this improved version
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

// Replace the fetchWithRetry function with this improved version
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

// Fetch posts with a specific tag (like 'fp')
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

// Fetch featured posts
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

// Fetch posts by category
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

// Fetch all categories with their posts
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

// Fetch recent posts
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

// Keep other functions as they are...
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

// Export other functions and interfaces as they were...
export const fetchAllAuthors = async () => fetchWithRetry(queries.allAuthors).then((data: any) => data.users.nodes)
export const fetchAllPosts = cache(async (limit = 1000) =>
  fetchWithRetry(queries.allPosts, { limit }).then((data: any) => data.posts.nodes),
)
export const fetchAllTags = cache(async () => fetchWithRetry(queries.allTags).then((data: any) => data.tags.nodes))
export const fetchPendingComments = async () =>
  fetchWithRetry(queries.pendingComments).then((data: any) => data.comments.nodes)
export const approveComment = async (id: string) =>
  fetchWithRetry(mutations.approveComment, { id }).then((data: any) => data.updateComment.success)
export const deleteComment = async (id: string) =>
  fetchWithRetry(mutations.deleteComment, { id }).then((data: any) => data.deleteComment.success)
export const fetchComments = async (postId: number) =>
  fetchWithRetry(queries.postComments, { postId }).then((data: any) => data.comments.nodes)
export const postComment = async (commentData: any) =>
  fetchWithRetry(mutations.createComment, { input: commentData }).then((data: any) => data.createComment)
export const searchPosts = async (query: string, after: string | null = null) =>
  fetchWithRetry(queries.searchPosts, { query, after }).then((data: any) => data.posts)
export const fetchBusinessPosts = async () => fetchCategoryPosts("business")
export const fetchNewsPosts = async () => fetchCategoryPosts("news")
export const fetchAuthorData = async (slug: string, after: string | null = null) =>
  fetchWithRetry(queries.authorData, { slug, after }).then((data: any) => data.user)
export const fetchSinglePost = async (slug: string) =>
  fetchWithRetry(queries.singlePost, { slug }).then((data: any) => data.post)
export const fetchUserProfile = async (token: string) =>
  fetchWithRetry(queries.currentUser, {}, 1, { Authorization: `Bearer ${token}` }).then((data: any) => data.viewer)
export const updateUserProfile = async (token: string, userData: any) =>
  fetchWithRetry(mutations.updateUser, { input: userData }, 1, { Authorization: `Bearer ${token}` }).then(
    (data: any) => data.updateUser.user,
  )
export const fetchPostsByTag = async (tag: string, after: string | null = null) =>
  fetchWithRetry(queries.postsByTag, { tag, after }).then((data: any) => data.posts)
export const fetchSingleTag = async (slug: string) =>
  fetchWithRetry(queries.singleTag, { slug }).then((data: any) => data.tag)
export const fetchSingleCategory = async (slug: string) =>
  fetchWithRetry(queries.singleCategory, { slug }).then((data: any) => data.category)

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
