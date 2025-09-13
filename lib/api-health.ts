import { getWpEndpoints } from "@/config/wp"
import logger from '@/utils/logger'

const CACHE_DURATION = 5 * 60 * 1000
let lastCheck = 0
const cachedHealth = {
  graphql: true,
  rest: true,
}

/**
 * Checks if the GraphQL API is healthy
 *
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the API is healthy
 */
export async function checkGraphQLHealth(): Promise<boolean> {
  const now = Date.now()
  const { graphql: WORDPRESS_API_URL } = getWpEndpoints()

  // Return cached result if it's recent enough
  if (now - lastCheck < CACHE_DURATION) {
    return cachedHealth.graphql
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(WORDPRESS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ __typename }",
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const isHealthy = response.ok

    // Update cache
    cachedHealth.graphql = isHealthy
    lastCheck = now

    return isHealthy
  } catch (error) {
    logger.error("GraphQL health check failed:", error)

    // Update cache
    cachedHealth.graphql = false
    lastCheck = now

    return false
  }
}

/**
 * Checks if the REST API is healthy
 *
 * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the API is healthy
 */
export async function checkRESTHealth(): Promise<boolean> {
  const now = Date.now()
  const { rest: WORDPRESS_REST_API_URL } = getWpEndpoints()

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
    logger.error("REST API health check failed:", error)

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
  const [graphqlHealthy, restHealthy] = await Promise.all([checkGraphQLHealth(), checkRESTHealth()])

  return graphqlHealthy || restHealthy
}
