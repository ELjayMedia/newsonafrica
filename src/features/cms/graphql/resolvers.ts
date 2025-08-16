import {
  fetchSinglePost,
  fetchRecentPosts,
  fetchCategoryPosts,
  fetchAllCategories,
  fetchSingleCategory,
  fetchAuthorData,
  fetchAllAuthors,
  fetchSingleTag,
  fetchAllTags,
  searchPosts,
  fetchComments,
} from "../lib/wordpress-api"
import { createClient } from "@supabase/supabase-js"
import DataLoader from "dataloader"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create DataLoaders for batching and caching
const postLoader = new DataLoader(async (slugs) => {
  // This is simplified - in a real implementation, you'd batch these requests
  return Promise.all(slugs.map((slug) => fetchSinglePost(slug as string)))
})

const categoryLoader = new DataLoader(async (slugs) => {
  return Promise.all(slugs.map((slug) => fetchSingleCategory(slug as string)))
})

const authorLoader = new DataLoader(async (slugs) => {
  return Promise.all(slugs.map((slug) => fetchAuthorData(slug as string, null)))
})

const tagLoader = new DataLoader(async (slugs) => {
  return Promise.all(slugs.map((slug) => fetchSingleTag(slug as string)))
})

export const resolvers = {
  Query: {
    posts: async (_, { limit = 10, offset = 0, category }) => {
      if (category) {
        const categoryData = await fetchCategoryPosts(category)
        const posts = categoryData?.posts?.nodes || []

        return {
          edges: posts.slice(offset, offset + limit),
          pageInfo: {
            hasNextPage: posts.length > offset + limit,
            endCursor: offset + limit < posts.length ? String(offset + limit) : null,
          },
          totalCount: posts.length,
        }
      }

      const posts = await fetchRecentPosts(offset + limit)

      return {
        edges: posts.slice(offset),
        pageInfo: {
          hasNextPage: posts.length > offset + limit,
          endCursor: offset + limit < posts.length ? String(offset + limit) : null,
        },
        totalCount: posts.length,
      }
    },

    post: async (_, { slug }) => {
      return postLoader.load(slug)
    },

    categories: async () => {
      return fetchAllCategories()
    },

    category: async (_, { slug }) => {
      return categoryLoader.load(slug)
    },

    authors: async () => {
      return fetchAllAuthors()
    },

    author: async (_, { slug }) => {
      return authorLoader.load(slug)
    },

    tags: async () => {
      return fetchAllTags()
    },

    tag: async (_, { slug }) => {
      return tagLoader.load(slug)
    },

    search: async (_, { query, limit = 10, offset = 0 }) => {
      const searchResults = await searchPosts(query)
      const posts = searchResults?.nodes || []

      return {
        edges: posts.slice(offset, offset + limit),
        pageInfo: {
          hasNextPage: posts.length > offset + limit,
          endCursor: offset + limit < posts.length ? String(offset + limit) : null,
        },
        totalCount: posts.length,
      }
    },

    me: async (_, __, { user }) => {
      if (!user) return null

      // Fetch user data from Supabase
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.error("Error fetching user profile:", error)
        return null
      }

      return data
    },
  },

  Mutation: {
    createComment: async (_, { input }, { user }) => {
      // Implementation for creating a comment
      // This would call your existing comment creation logic
      // Return the created comment
      return null // Placeholder
    },

    bookmarkPost: async (_, { postId }, { user }) => {
      if (!user) {
        throw new Error("Authentication required")
      }

      // Add bookmark to Supabase
      const { data, error } = await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId }).single()

      if (error) {
        console.error("Error creating bookmark:", error)
        return {
          success: false,
          message: "Failed to bookmark post",
        }
      }

      const post = await fetchSinglePost(postId)

      return {
        success: true,
        message: "Post bookmarked successfully",
        post,
      }
    },

    removeBookmark: async (_, { postId }, { user }) => {
      if (!user) {
        throw new Error("Authentication required")
      }

      // Remove bookmark from Supabase
      const { error } = await supabase.from("bookmarks").delete().match({ user_id: user.id, post_id: postId })

      if (error) {
        console.error("Error removing bookmark:", error)
        return {
          success: false,
          message: "Failed to remove bookmark",
        }
      }

      return {
        success: true,
        message: "Bookmark removed successfully",
      }
    },

    updateProfile: async (_, { input }, { user }) => {
      if (!user) {
        throw new Error("Authentication required")
      }

      // Update user profile in Supabase
      const { data, error } = await supabase.from("profiles").update(input).eq("id", user.id).single()

      if (error) {
        console.error("Error updating profile:", error)
        throw new Error("Failed to update profile")
      }

      return data
    },
  },

  Post: {
    author: async (post) => {
      return post.author?.node || authorLoader.load(post.author?.slug || "")
    },

    categories: async (post) => {
      return post.categories?.nodes || []
    },

    tags: async (post) => {
      return post.tags?.nodes || []
    },

    comments: async (post, { limit = 10 }) => {
      const comments = await fetchComments(post.id)
      return comments.slice(0, limit)
    },

    commentCount: async (post) => {
      const comments = await fetchComments(post.id)
      return comments.length
    },

    isBookmarked: async (post, _, { user }) => {
      if (!user) return false

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .single()

      return !!data && !error
    },
  },

  Category: {
    posts: async (category, { limit = 10, offset = 0 }) => {
      const categoryData = await fetchCategoryPosts(category.slug)
      const posts = categoryData?.posts?.nodes || []

      return {
        edges: posts.slice(offset, offset + limit),
        pageInfo: {
          hasNextPage: posts.length > offset + limit,
          endCursor: offset + limit < posts.length ? String(offset + limit) : null,
        },
        totalCount: posts.length,
      }
    },

    parent: async (category) => {
      if (!category.parent) return null
      return categoryLoader.load(category.parent.node.slug)
    },

    children: async (category) => {
      // This would require an additional API call to get child categories
      // For now, returning an empty array
      return []
    },
  },

  Author: {
    posts: async (author, { limit = 10, offset = 0 }) => {
      const authorData = await fetchAuthorData(author.slug, null)
      const posts = authorData?.posts?.nodes || []

      return {
        edges: posts.slice(offset, offset + limit),
        pageInfo: {
          hasNextPage: posts.length > offset + limit,
          endCursor: offset + limit < posts.length ? String(offset + limit) : null,
        },
        totalCount: posts.length,
      }
    },
  },

  Tag: {
    posts: async (tag, { limit = 10, offset = 0 }) => {
      const tagData = await fetchSingleTag(tag.slug)
      const posts = tagData?.posts?.nodes || []

      return {
        edges: posts.slice(offset, offset + limit),
        pageInfo: {
          hasNextPage: posts.length > offset + limit,
          endCursor: offset + limit < posts.length ? String(offset + limit) : null,
        },
        totalCount: posts.length,
      }
    },
  },

  Comment: {
    author: async (comment) => {
      return {
        id: comment.author?.id,
        name: comment.author?.name || "Anonymous",
        avatar: comment.author?.avatar?.url,
        isRegistered: !!comment.author?.id,
      }
    },

    post: async (comment) => {
      return postLoader.load(comment.post.slug)
    },

    parent: async (comment) => {
      if (!comment.parent) return null
      // This would require an additional API call to get the parent comment
      // For now, returning null
      return null
    },

    replies: async (comment) => {
      // This would require an additional API call to get replies
      // For now, returning an empty array
      return []
    },
  },

  User: {
    bookmarks: async (user) => {
      const { data, error } = await supabase.from("bookmarks").select("post_id").eq("user_id", user.id)

      if (error || !data) {
        console.error("Error fetching bookmarks:", error)
        return []
      }

      // Fetch posts for each bookmark
      const posts = await Promise.all(data.map((bookmark) => fetchSinglePost(bookmark.post_id)))

      return posts.filter(Boolean)
    },

    comments: async (user) => {
      // This would require an additional API call to get user comments
      // For now, returning an empty array
      return []
    },
  },
}
