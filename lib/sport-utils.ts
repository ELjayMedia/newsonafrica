import { cache } from "react"
import { fetchPosts } from "./wordpress-api"
import type { WordPressPost } from "@/types/wp"

async function fetchCategoryPosts(slug: string, count: number): Promise<WordPressPost[]> {
  const response = await fetchPosts({ perPage: count, category: slug })

  if (Array.isArray(response)) {
    return response
  }

  return response?.data ?? []
}

export const fetchSportPosts = cache(async (count = 5): Promise<WordPressPost[]> => {
  try {
    // Try to fetch posts from the "sport" category
    let posts = await fetchCategoryPosts("sport", count)

    // If no posts found, try the "sports" category (plural)
    if (posts.length === 0) {
      posts = await fetchCategoryPosts("sports", count)
    }

    return posts
  } catch (error) {
    console.error("Error fetching sport posts:", error)
    return []
  }
})
