import { getRestBase } from "@/lib/wp-endpoints"

const CACHE_DURATION = 5 * 60 * 1000
let lastCheck = 0
const cachedHealth = {
  rest: true,
}

/**
 * Checks if the REST API is healthy
 *
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the API is healthy
 */
export async function checkRESTHealth(): Promise<boolean> {
  const now = Date.now()
  const WORDPRESS_REST_API_URL = getRestBase()

  // Return cached result if it's recent enough
  if (now - lastCheck < CACHE_DURATION) {
    return cachedHealth.rest
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${WORDPRESS_REST_API_URL}/posts?per_page=1`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const isHealthy = response.ok

    // Update cache
    cachedHealth.rest = isHealthy
    lastCheck = now

    return isHealthy
  } catch (error) {
    console.error("REST API health check failed:", error)

    // Update cache
    cachedHealth.rest = false
    lastCheck = now

    return false
  }
}

/**
 * Checks if any API is healthy
 *
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if any API is healthy
 */
export async function isAnyAPIHealthy(): Promise<boolean> {
  return checkRESTHealth()
}
