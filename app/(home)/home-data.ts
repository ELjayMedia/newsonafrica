import "server-only"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import {
  getAggregatedLatestHome,
  getFpTaggedPostsForCountry,
  type AggregatedHomeData,
} from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

export const HOME_FEED_REVALIDATE = 60
const HOME_FEED_FALLBACK_LIMIT = 6

const createEmptyAggregatedHome = (): AggregatedHomeData => ({
  heroPost: null,
  secondaryPosts: [],
  remainingPosts: [],
})

const buildAggregatedHomeFromPosts = (posts: HomePost[]): AggregatedHomeData => {
  if (posts.length === 0) {
    return createEmptyAggregatedHome()
  }

  const [heroPost, ...rest] = posts

  return {
    heroPost,
    secondaryPosts: rest.slice(0, 3),
    remainingPosts: rest.slice(3),
  }
}

export const HOME_FEED_CACHE_TAGS = buildCacheTags({
  section: "home-feed",
  extra: ["tag:home-feed"],
})

const inflightRequests = new Map<string, Promise<AggregatedHomeData>>()

const buildCacheKey = (baseUrl: string, cacheTags: string[]): string => {
  const normalizedTags = Array.from(new Set(cacheTags)).sort()
  return `${baseUrl}|${normalizedTags.join("|")}`
}

async function fetchAggregatedHomeUncached(
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

export function fetchAggregatedHome(
  baseUrl: string,
  cacheTags: string[],
): Promise<AggregatedHomeData> {
  const cacheKey = buildCacheKey(baseUrl, cacheTags)
  const existing = inflightRequests.get(cacheKey)
  if (existing) {
    return existing
  }

  const request = fetchAggregatedHomeUncached(baseUrl, cacheTags).finally(() => {
    inflightRequests.delete(cacheKey)
  })

  inflightRequests.set(cacheKey, request)
  return request
}

export async function fetchAggregatedHomeForCountry(
  countryCode: string,
  limit = HOME_FEED_FALLBACK_LIMIT,
): Promise<AggregatedHomeData> {
  try {
    const fpTaggedPosts = await getFpTaggedPostsForCountry(countryCode, limit)

    return buildAggregatedHomeFromPosts(fpTaggedPosts)
  } catch (error) {
    console.error(`[v0] Failed to assemble home feed for country ${countryCode}`, { error })
    return createEmptyAggregatedHome()
  }
}

export type { AggregatedHomeData } from "@/lib/wordpress-api"
