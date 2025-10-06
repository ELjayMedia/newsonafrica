import { NextRequest, NextResponse } from "next/server"
import { getAggregatedLatestHome, type AggregatedHomeData } from "@/lib/wordpress-api"
import { KV_CACHE_KEYS } from "@/lib/cache/constants"
import { createCacheEntry, getEntryAge, kvCache } from "@/lib/cache/kv"

export const runtime = "edge"
export const revalidate = 0

const CACHE_TTL_SECONDS = 60
const STALE_AFTER_MS = 30_000
const POSTS_PER_COUNTRY = 6

async function fetchAndPersistHomeFeed(): Promise<AggregatedHomeData> {
  const data = await getAggregatedLatestHome(POSTS_PER_COUNTRY)

  try {
    await kvCache.set(KV_CACHE_KEYS.HOME_FEED, createCacheEntry(data), CACHE_TTL_SECONDS)
  } catch (error) {
    console.error("Failed to persist home feed cache", { error })
  }

  return data
}

export async function GET(request: NextRequest) {
  const cacheKey = KV_CACHE_KEYS.HOME_FEED
  const cached = await kvCache.get<AggregatedHomeData>(cacheKey)
  const age = getEntryAge(cached)

  const hasValue = Boolean(cached?.value)
  const isFresh = hasValue && age < STALE_AFTER_MS
  const isExpired = hasValue && age >= CACHE_TTL_SECONDS * 1000

  if (!hasValue || isExpired) {
    const freshData = await fetchAndPersistHomeFeed()
    return NextResponse.json(freshData, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }

  if (!isFresh) {
    kvCache.runBackgroundRefresh(request, async () => {
      const freshData = await getAggregatedLatestHome(POSTS_PER_COUNTRY)
      await kvCache.set(cacheKey, createCacheEntry(freshData), CACHE_TTL_SECONDS)
    })
  }

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
