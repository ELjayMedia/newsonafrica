import useSWR from "swr"
import { fetchRecentPosts, fetchMostReadPosts } from "@/lib/wordpress-api"

export type SidebarContentData = {
  recent: any[]
  mostRead: any[]
}

export async function fetchSidebarContentData(country: string): Promise<SidebarContentData> {
  const [recentResponse, mostReadResponse] = await Promise.all([
    fetchRecentPosts(10, country),
    fetchMostReadPosts(country, 10),
  ])

  const recent = Array.isArray(recentResponse) ? recentResponse : []
  const mostRead = Array.isArray(mostReadResponse) ? mostReadResponse : []

  return { recent, mostRead }
}

export function useSidebarContent(country: string) {
  return useSWR<SidebarContentData>(
    ["sidebar-content", country],
    () => fetchSidebarContentData(country),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000 * 60 * 3,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    },
  )
}
