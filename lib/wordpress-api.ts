import { GraphQLClient } from "graphql-request"
import { queries, mutations } from "./wordpress-queries"
import { cache } from "react"

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || process.env.NEXT_PUBLIC_WORDPRESS_API_URL

if (!WORDPRESS_API_URL) {
  console.error("WORDPRESS_API_URL or NEXT_PUBLIC_WORDPRESS_API_URL is not set in the environment variables.")
}

// Create a more robust client with timeout
export const client = new GraphQLClient(WORDPRESS_API_URL || "", {
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
})

// Mock data for fallback when API is unavailable
const FALLBACK_DATA = {
  posts: {
    nodes: [
      {
        id: "fallback-1",
        title: "Unable to connect to content server",
        excerpt: "We're experiencing technical difficulties. Please try again later.",
        slug: "connection-error",
        date: new Date().toISOString(),
        modified: new Date().toISOString(),
        featuredImage: null,
        author: {
          node: {
            name: "System",
            slug: "system",
            description: "",
            avatar: {
              url: "",
            },
          },
        },
        categories: {
          nodes: [
            {
              name: "News",
              slug: "news",
            },
          ],
        },
        tags: {
          nodes: [],
        },
      },
    ],
  },
  categories: {
    nodes: [
      {
        name: "News",
        slug: "news",
      },
    ],
  },
  tags: {
    nodes: [],
  },
  comments: {
    nodes: [],
  },
}

const fetchWithRetry = async (
  query: string,
  variables = {},
  maxRetries = 3,
  headers: Record<string, string> = {},
  useFallback = true,
) => {
  // Check if we're in a browser environment and show a more user-friendly message
  if (typeof window !== "undefined") {
    console.log("Fetching WordPress data...")
  }

  // Validate API URL before attempting to fetch
  if (!WORDPRESS_API_URL) {
    console.error("WordPress API URL is not configured")
    if (useFallback) {
      return getFallbackData(query)
    }
    throw new Error("WordPress API URL is not configured")
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await client.request(query, variables, headers)
      return response
    } catch (error) {
      const attempt = i + 1
      console.error(`API request attempt ${attempt}/${maxRetries} failed:`)

      if (error instanceof Error) {
        console.error(`Error type: ${error.name}`)
        console.error(`Error message: ${error.message}`)
        console.error(`Error stack: ${error.stack}`)
      } else {
        console.error("Unknown error type:", error)
      }

      // If we've reached max retries, either throw or return fallback
      if (i === maxRetries - 1) {
        if (useFallback) {
          console.warn("Using fallback data after all retry attempts failed")
          return getFallbackData(query)
        }
        throw new Error(
          `Failed after ${maxRetries} retries: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Exponential backoff with jitter
      const delay = 1000 * Math.pow(2, i) * (0.5 + Math.random() * 0.5)
      console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error(`Failed after ${maxRetries} retries`)
}

// Helper function to return appropriate fallback data based on the query
const getFallbackData = (query: string) => {
  if (query.includes("posts")) {
    return { posts: FALLBACK_DATA.posts }
  } else if (query.includes("categories")) {
    return { categories: FALLBACK_DATA.categories }
  } else if (query.includes("tags")) {
    return { tags: FALLBACK_DATA.tags }
  } else if (query.includes("comments")) {
    return { comments: FALLBACK_DATA.comments }
  } else if (query.includes("post(")) {
    return { post: FALLBACK_DATA.posts.nodes[0] }
  } else if (query.includes("category(")) {
    return { category: FALLBACK_DATA.categories.nodes[0] }
  } else if (query.includes("tag(")) {
    return { tag: FALLBACK_DATA.tags.nodes[0] }
  }

  // Default fallback
  return FALLBACK_DATA
}

export const fetchCategoryPosts = cache(async (slug: string, after: string | null = null) =>
  fetchWithRetry(queries.categoryPosts, { slug, after }).then((data: any) => data.category),
)

export const fetchAllCategories = cache(async () =>
  fetchWithRetry(queries.allCategories).then((data: any) => data.categories.nodes),
)

// Add new functions for SEO

export const fetchAllAuthors = async () => fetchWithRetry(queries.allAuthors).then((data: any) => data.users.nodes)

export const fetchAllPosts = cache(async (limit = 1000) =>
  fetchWithRetry(queries.allPosts, { limit }).then((data: any) => data.posts.nodes),
)

export const fetchAllTags = cache(async () => fetchWithRetry(queries.allTags).then((data: any) => data.tags.nodes))

export const fetchPendingComments = async () =>
  fetchWithRetry(queries.pendingComments).then((data: any) => data.comments.nodes)

export const approveComment = async (id: string) =>
  fetchWithRetry(mutations.approveComment, { id }, 3, {}, false).then((data: any) => data.updateComment.success)

export const deleteComment = async (id: string) =>
  fetchWithRetry(mutations.deleteComment, { id }, 3, {}, false).then((data: any) => data.deleteComment.success)

export const fetchComments = async (postId: number) =>
  fetchWithRetry(queries.postComments, { postId }).then((data: any) => data.comments.nodes)

export const postComment = async (commentData: any) =>
  fetchWithRetry(mutations.createComment, { input: commentData }, 3, {}, false).then((data: any) => data.createComment)

export const searchPosts = async (query: string, after: string | null = null) =>
  fetchWithRetry(queries.searchPosts, { query, after }).then((data: any) => data.posts)

export const fetchBusinessPosts = async () => fetchCategoryPosts("business")

export const fetchNewsPosts = async () => fetchCategoryPosts("news")

export const fetchTaggedPosts = async (tag: string, limit: number) =>
  fetchWithRetry(queries.taggedPosts, { tag, limit }).then((data: any) => data.posts.nodes)

export const fetchRecentPosts = async (limit = 10) =>
  fetchWithRetry(queries.recentPosts, { limit }).then((data: any) => data.posts.nodes)

export const fetchAuthorData = async (slug: string, after: string | null = null) =>
  fetchWithRetry(queries.authorData, { slug, after }).then((data: any) => data.user)

export const fetchFeaturedPosts = cache(async () =>
  fetchWithRetry(queries.featuredPosts).then((data: any) => data.posts.nodes),
)

export const fetchCategorizedPosts = async () =>
  fetchWithRetry(queries.categorizedPosts).then((data: any) => data.categories.nodes)

export const fetchSinglePost = async (slug: string) =>
  fetchWithRetry(queries.singlePost, { slug }).then((data: any) => data.post)

export const fetchUserProfile = async (token: string) =>
  fetchWithRetry(queries.currentUser, {}, 1, { Authorization: `Bearer ${token}` }, false).then(
    (data: any) => data.viewer,
  )

export const updateUserProfile = async (token: string, userData: any) =>
  fetchWithRetry(mutations.updateUser, { input: userData }, 1, { Authorization: `Bearer ${token}` }, false).then(
    (data: any) => data.updateUser.user,
  )

export const fetchPostsByTag = async (tag: string, after: string | null = null) =>
  fetchWithRetry(queries.postsByTag, { tag, after }).then((data: any) => data.posts)

export const fetchSingleTag = async (slug: string) =>
  fetchWithRetry(queries.singleTag, { slug }).then((data: any) => data.tag)

export const fetchSingleCategory = async (slug: string) =>
  fetchWithRetry(queries.singleCategory, { slug }).then((data: any) => data.category)

/**
 * Fetches the most popular posts based on view count or other metrics
 * @param count Number of popular posts to fetch
 * @returns Array of popular posts
 */
export async function fetchPopularPosts(count = 5) {
  try {
    // In a production environment, you would fetch this data from:
    // 1. A WordPress plugin that tracks post views
    // 2. Google Analytics API
    // 3. A custom endpoint that returns popular posts

    // For now, we'll use the WordPress API with a meta_query for a custom field
    // that might store view counts (if you have such a setup)
    const response = await fetch(
      `${process.env.WORDPRESS_API_URL}/posts?_fields=id,title,slug,date&per_page=${count}&orderby=meta_value_num&meta_key=post_views_count&order=desc`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    )

    if (!response.ok) {
      // If the meta_query approach fails, fall back to recent posts
      return fetchRecentPosts(count)
    }

    const posts = await response.json()
    return posts
  } catch (error) {
    console.error("Error fetching popular posts:", error)
    // Fallback to recent posts in case of error
    return fetchRecentPosts(count)
  }
}

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
