import { getCategories, type WordPressCategory } from "@/lib/api/wordpress"
import { QueryClient, dehydrate } from "@tanstack/react-query"

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

type CacheEntry = { categories: WordPressCategory[]; timestamp: number }
const cache = new Map<string, CacheEntry>()

/**
 * Fetch categories for one or more countries on the server with caching.
 * Returns a map of country code to categories and a dehydrated React Query state
 * containing the same data.
 */
export async function getServerCategories(
  countryCodes?: string | string[],
): Promise<{ categories: Record<string, WordPressCategory[]>; dehydratedState: unknown }> {
  const codes = Array.isArray(countryCodes)
    ? countryCodes
    : [countryCodes || DEFAULT_COUNTRY]

  const queryClient = new QueryClient()
  const result: Record<string, WordPressCategory[]> = {}
  const now = Date.now()

  for (const code of codes) {
    const key = code.toLowerCase()
    const cached = cache.get(key)
    if (cached && now - cached.timestamp < CACHE_TTL) {
      result[key] = cached.categories
      queryClient.setQueryData(["categories", key], cached.categories)
      continue
    }

    const categories = await getCategories(key)
    cache.set(key, { categories, timestamp: now })
    result[key] = categories
    queryClient.setQueryData(["categories", key], categories)
  }

  return { categories: result, dehydratedState: dehydrate(queryClient) }
}
