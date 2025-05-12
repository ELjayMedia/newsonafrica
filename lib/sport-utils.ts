import { cache } from "react"
import { fetchCategoryPosts } from "./wordpress-api"

export const fetchSportPosts = cache(async (limit = 5) => {
  try {
    const sportCategory = await fetchCategoryPosts("sport", limit)
    return sportCategory?.posts?.nodes || []
  } catch (error) {
    console.error("Error fetching sport posts:", error)
    return []
  }
})
