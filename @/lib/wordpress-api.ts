import { GraphQLClient } from "graphql-request"
import { queries, mutations } from "./wordpress-queries"
import { cache } from "react"

const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL

if (!WORDPRESS_API_URL) {
  console.error("NEXT_PUBLIC_WORDPRESS_API_URL is not set in the environment variables.")
}

export const client = new GraphQLClient(WORDPRESS_API_URL || "")

const fetchWithRetry = async (query: string, variables = {}, maxRetries = 3, headers: Record<string, string> = {}) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await client.request(query, variables, headers)
      return response
    } catch (error) {
      console.error(`API request attempt ${i + 1} failed:`, error)
      if (error instanceof Error) {
        console.error("Error details:", error.message)
      }
      if (i === maxRetries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`)
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
