import { fetchWordPressGraphQL } from "./client"
import { cacheWordPressContent } from "@/lib/server/unified-cache"

/**
 * WordPress GraphQL wrapper with unified caching
 */
export async function fetchPostWithCache<T>(
  editionCode: string,
  query: string,
  variables: Record<string, any> = {},
  options: {
    revalidate?: number
    fallback?: T
  } = {},
): Promise<T> {
  const postId = variables.id || variables.slug || "unknown"

  const result = await cacheWordPressContent(
    editionCode,
    "post",
    postId,
    () => fetchWordPressGraphQL<T>(editionCode, query, variables),
    options,
  )

  return result
}

/**
 * Fetch multiple posts with caching
 */
export async function fetchPostsWithCache<T>(
  editionCode: string,
  query: string,
  variables: Record<string, any> = {},
  options: {
    revalidate?: number
    fallback?: T
  } = {},
): Promise<T> {
  const cacheKey = `${editionCode}:posts:${JSON.stringify(variables)}`

  const result = await cacheWordPressContent(
    editionCode,
    "page",
    cacheKey,
    () => fetchWordPressGraphQL<T>(editionCode, query, variables),
    options,
  )

  return result
}
