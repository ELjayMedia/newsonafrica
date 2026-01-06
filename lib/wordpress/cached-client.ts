import { fetchWordPressGraphQL } from "./client"
import { cacheWordPressContent, storeKVFallback } from "@/lib/cache/unified-cache"

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
    async () => {
      const data = await fetchWordPressGraphQL<T>(editionCode, query, variables)

      // Store in KV as stale fallback
      await storeKVFallback(`wp:${editionCode}:post:${postId}`, data)

      return data
    },
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
    async () => {
      const data = await fetchWordPressGraphQL<T>(editionCode, query, variables)

      await storeKVFallback(`wp:${cacheKey}`, data)

      return data
    },
    options,
  )

  return result
}
