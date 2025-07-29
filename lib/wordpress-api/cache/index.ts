export const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const searchCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
export const SEARCH_CACHE_TTL = 10 * 60 * 1000 // 10 minutes for search results
export const SUGGESTION_CACHE_TTL = 30 * 60 * 1000 // 30 minutes for suggestions

export const clearApiCache = () => {
  apiCache.clear()
}

export const getCacheStats = () => ({
  size: apiCache.size,
  keys: Array.from(apiCache.keys()),
})

export const getSearchCacheStats = () => ({
  size: searchCache.size,
  keys: Array.from(searchCache.keys()),
})
