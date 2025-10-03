import "server-only"

import { getAggregatedLatestHome, type AggregatedHomeData } from "@/lib/wordpress-api"

export const HOME_FEED_REVALIDATE = 60
const HOME_FEED_FALLBACK_LIMIT = 6

export async function fetchAggregatedHome(
  baseUrl: string,
  cacheTags: string[],
): Promise<AggregatedHomeData> {
  const endpoint = new URL("/api/home-feed", baseUrl)

  try {
    const response = await fetch(endpoint, {
      next: { tags: cacheTags, revalidate: HOME_FEED_REVALIDATE },
    })

    if (response.ok) {
      const data = (await response.json()) as AggregatedHomeData | null
      if (data) {
        return data
      }
    }
  } catch (error) {
    console.error("Failed to fetch home feed", { error })
  }

  return getAggregatedLatestHome(HOME_FEED_FALLBACK_LIMIT)
}
