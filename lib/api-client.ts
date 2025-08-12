import { cache } from "react"
import { client } from "./api/wordpress"
import { queries } from "./wordpress-queries"
import { FALLBACK_POSTS, MOCK_HOMEPAGE_DATA } from "./mock-data"

// Cache time constants
const CACHE_TIMES = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
}

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Update the fetchAPI function with better error handling and retry logic
export async function fetchAPI(query: string, variables = {}, maxRetries = 3) {
  // If we're offline, don't even try to fetch
  if (!isOnline()) {
    console.log("Device is offline, skipping API request")
    throw new Error("Device is offline")
  }

  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await client.request(query, variables, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      console.error(`API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      // Check if it's a network error or timeout
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("Network request failed") ||
          error.message.includes("aborted"))

      if (isNetworkError) {
        console.log("Network error detected, may be offline")
        // If it's a network error, don't retry too many times
        if (attempt >= 1) break
      }

      // Exponential backoff with a maximum delay of 8 seconds
      if (attempt < maxRetries - 1) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000)
        await new Promise((resolve) => setTimeout(resolve, backoffTime))
      }
    }
  }

  throw lastError
}

// Update the fetchHomepageData function to use the new mock data structure
export const fetchHomepageData = cache(async () => {
  try {
    if (!isOnline()) {
      console.log("Device is offline, using mock data")
      return {
        featuredPosts: MOCK_HOMEPAGE_DATA.secondaryPosts,
        categories: MOCK_HOMEPAGE_DATA.categories.map((cat) => ({
          ...cat,
          posts: { nodes: MOCK_HOMEPAGE_DATA.categoryPosts[cat.slug] || [] },
        })),
        taggedPosts: [MOCK_HOMEPAGE_DATA.featuredPost, ...MOCK_HOMEPAGE_DATA.secondaryPosts],
      }
    }

    try {
      const [featured, categories, tagged] = await Promise.allSettled([
        fetchAPI(queries.featuredPosts),
        fetchAPI(queries.categorizedPosts),
        fetchAPI(queries.taggedPosts, { tag: "fp", limit: 5 }),
      ])

      // Process results, handling any individual promise rejections
      return {
        featuredPosts: featured.status === "fulfilled" ? featured.value.posts.nodes : FALLBACK_POSTS,
        categories:
          categories.status === "fulfilled" ? categories.value.categories.nodes : MOCK_HOMEPAGE_DATA.categories,
        taggedPosts: tagged.status === "fulfilled" ? tagged.value.posts.nodes : FALLBACK_POSTS,
      }
    } catch (error) {
      console.error("Error fetching homepage data, using fallback data:", error)
      return {
        featuredPosts: FALLBACK_POSTS,
        categories: MOCK_HOMEPAGE_DATA.categories,
        taggedPosts: FALLBACK_POSTS,
      }
    }
  } catch (error) {
    console.error("Error in fetchHomepageData, using fallback data:", error)
    return {
      featuredPosts: FALLBACK_POSTS,
      categories: MOCK_HOMEPAGE_DATA.categories,
      taggedPosts: FALLBACK_POSTS,
    }
  }
})

// Update the fetchCompleteHomepageData function similarly
export const fetchCompleteHomepageData = cache(async () => {
  try {
    if (!isOnline()) {
      console.log("Device is offline, using mock data")
      return {
        featuredPosts: MOCK_HOMEPAGE_DATA.secondaryPosts,
        categories: MOCK_HOMEPAGE_DATA.categories.map((cat) => ({
          ...cat,
          posts: { nodes: MOCK_HOMEPAGE_DATA.categoryPosts[cat.slug] || [] },
        })),
        taggedPosts: [MOCK_HOMEPAGE_DATA.featuredPost, ...MOCK_HOMEPAGE_DATA.secondaryPosts],
        recentPosts: FALLBACK_POSTS,
      }
    }

    const baseData = await fetchHomepageData()

    // Get recent posts as a fallback for any category that might be missing
    try {
      const recentPostsResponse = await fetchAPI(queries.recentPosts, { limit: 10 })
      const recentPosts = recentPostsResponse.posts.nodes || FALLBACK_POSTS

      return {
        ...baseData,
        recentPosts,
      }
    } catch (error) {
      console.error("Error fetching recent posts, using fallback data:", error)
      return {
        ...baseData,
        recentPosts: FALLBACK_POSTS,
      }
    }
  } catch (error) {
    console.error("Error fetching complete homepage data, using fallback data:", error)
    return {
      featuredPosts: FALLBACK_POSTS,
      categories: MOCK_HOMEPAGE_DATA.categories,
      taggedPosts: FALLBACK_POSTS,
      recentPosts: FALLBACK_POSTS,
    }
  }
})
