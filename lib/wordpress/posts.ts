import {
  fetchRecentPosts,
  fetchSinglePost,
  fetchTaggedPosts,
  fetchPostsByTag,
  fetchFeaturedPosts,
  fetchCategorizedPosts,
  fetchAllPosts,
  fetchPosts,
} from "../wordpress-api"
export type { Post } from "../wordpress-api"

/**
 * Fetch posts with real view counts from the analytics API
 */
export async function fetchMostReadPosts(limit = 5) {
  const url = `/api/analytics/most-read?limit=${limit}`
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch most read posts")
  }

  const data = await res.json()
  return data.posts || []
}

export {
  fetchRecentPosts,
  fetchSinglePost,
  fetchTaggedPosts,
  fetchPostsByTag,
  fetchFeaturedPosts,
  fetchCategorizedPosts,
  fetchAllPosts,
  fetchPosts,
}
