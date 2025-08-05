import { getCountryEndpoints } from "../getCountryEndpoints"

// Default endpoints derived from environment variables
const defaultEndpoints = getCountryEndpoints()
export const WORDPRESS_GRAPHQL_URL = defaultEndpoints.graphql
export const WORDPRESS_REST_URL = `${defaultEndpoints.rest}/wp-json/wp/v2`

if (!WORDPRESS_GRAPHQL_URL) {
  console.error(
    "WORDPRESS_GRAPHQL_URL is not set in the environment variables."
  )
}

// Simple cache implementation
export const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Check if we're in a browser environment and if we're online
const isOnline = () => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine
  }
  return true // Assume online in SSR context
}

// Check if we're in a server environment
const isServer = () => typeof window === "undefined"

/** Simple GraphQL request function with proper headers */
export async function graphqlRequest(
  query: string,
  variables: Record<string, any> = {},
  countryCode?: string,
) {
  const { graphql } = getCountryEndpoints(countryCode)
  const response = await fetch(graphql, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "NewsOnAfrica/1.0",
      Connection: "keep-alive",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result.data
}

/** Fetches data from the WordPress REST API with retry logic. */
export async function fetchFromRestApi(
  endpoint: string,
  params: Record<string, any> = {},
  countryCode?: string,
) {
  const { rest } = getCountryEndpoints(countryCode)
  const queryParams = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString()

  const url = `${rest}/wp-json/wp/v2/${endpoint}${queryParams ? `?${queryParams}` : ""}`

  const MAX_RETRIES = 3
  let lastError

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "NewsOnAfrica/1.0",
          Connection: "keep-alive",
          "Accept-Encoding": "gzip",
        },
        signal: controller.signal,
        cache: "no-store",
        next: { revalidate: 0 },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`REST API request attempt ${attempt + 1} failed:`, error)
      lastError = error

      if (attempt === MAX_RETRIES - 1) {
        throw error
      }

      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000)
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
    }
  }

  throw lastError
}

/** Fetches data with caching and fallback to REST API */
export async function fetchWithFallback(
  query: string,
  variables: Record<string, any> = {},
  cacheKey: string,
  restFallback: () => Promise<any>,
  countryCode?: string,
) {
  const cached = apiCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }

  if (!isServer() && !isOnline()) {
    console.log("Device is offline, using cache or returning empty data")
    return cached?.data || []
  }

  try {
    const data = await graphqlRequest(query, variables, countryCode)
    apiCache.set(cacheKey, { data, timestamp: Date.now(), ttl: CACHE_TTL })
    return data
  } catch (error) {
    console.error("GraphQL request failed, falling back to REST API:", error)

    try {
      const restData = await restFallback()
      apiCache.set(cacheKey, { data: restData, timestamp: Date.now(), ttl: CACHE_TTL })
      return restData
    } catch (restError) {
      console.error("Both GraphQL and REST API failed:", restError)
      return cached?.data || []
    }
  }
}

export const client = {
  query: graphqlRequest,
  endpoint: WORDPRESS_GRAPHQL_URL,
  restEndpoint: WORDPRESS_REST_URL,
}

export const clearApiCache = () => {
  apiCache.clear()
}

export const getCacheStats = () => {
  return {
    size: apiCache.size,
    keys: Array.from(apiCache.keys()),
  }
}
