import { cache } from "react"
import { client } from "./wordpress-api"
import { queries } from "./wordpress-queries"

// Cache time constants
const CACHE_TIMES = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
}

// Reusable fetch function with error handling and retries
export async function fetchAPI(query: string, variables = {}, maxRetries = 3) {
  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.request(query, variables)
    } catch (error) {
      console.error(`API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError
}

// Cached API functions
export const fetchHomepageData = cache(async () => {
  const [featured, categories, tagged] = await Promise.all([
    fetchAPI(queries.featuredPosts),
    fetchAPI(queries.categorizedPosts),
    fetchAPI(queries.taggedPosts, { tag: "fp", limit: 5 }),
  ])

  return {
    featuredPosts: featured.posts.nodes,
    categories: categories.categories.nodes,
    taggedPosts: tagged.posts.nodes,
  }
})

// Other optimized fetch functions can be added here
