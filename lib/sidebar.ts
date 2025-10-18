import { fetchRecentPosts } from "@/lib/wordpress-api"
import { fetchMostReadPosts } from "@/lib/wordpress/posts"
import type { SidebarContentPayload } from "@/types/sidebar"

const normalizeArray = <T>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : []
}

export const DEFAULT_SIDEBAR_RECENT_LIMIT = 10
export const DEFAULT_SIDEBAR_MOST_READ_LIMIT = 10

export interface SidebarContentRequest {
  country: string
  recentLimit?: number
  mostReadLimit?: number
  requestUrl?: string
}

export async function fetchSidebarContent({
  country,
  recentLimit = DEFAULT_SIDEBAR_RECENT_LIMIT,
  mostReadLimit = DEFAULT_SIDEBAR_MOST_READ_LIMIT,
  requestUrl,
}: SidebarContentRequest): Promise<SidebarContentPayload> {
  const [recentResult, mostReadResult] = await Promise.allSettled([
    fetchRecentPosts(recentLimit, country),
    fetchMostReadPosts(country, mostReadLimit, { requestUrl }),
  ])

  return {
    recent: normalizeArray(recentResult.status === "fulfilled" ? recentResult.value : []),
    mostRead: normalizeArray(mostReadResult.status === "fulfilled" ? mostReadResult.value : []),
  }
}
