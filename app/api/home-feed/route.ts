import { NextRequest, NextResponse } from "next/server"
import { getAggregatedLatestHome, type AggregatedHomeData } from "@/lib/wordpress-api"
import { KV_CACHE_KEYS } from "@/lib/cache/constants"
import { createCacheEntry, getEntryAge, kvCache } from "@/lib/cache/kv"

export const runtime = "edge"
export const revalidate = 0

// The home feed response is cached at the CDN edge so the same payload can be
// re-used for a short period. A fresh response is served for CACHE_TTL_SECONDS,
// after which the cache will serve stale data while a background refresh runs
// until the TTL is reached. Operators can tune these values to control how
// aggressively the feed is cached.
const CACHE_TTL_SECONDS = 60
const STALE_AFTER_MS = 30_000
const STALE_WHILE_REVALIDATE_SECONDS = Math.max(
  0,
  Math.floor((CACHE_TTL_SECONDS * 1000 - STALE_AFTER_MS) / 1000),
)

const CACHE_CONTROL_HEADER = `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
const POSTS_PER_COUNTRY = 6

const refreshGuards = new Map<string, Promise<void>>()

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
        "Cache-Control": CACHE_CONTROL_HEADER,
      },
    })
  }

  if (!isFresh) {
    if (refreshGuards.has(cacheKey)) {
      console.log("Skipping home feed refresh; refresh already in progress")
    } else {
      const refreshPromise = (async () => {
        try {
          const freshData = await getAggregatedLatestHome(POSTS_PER_COUNTRY)
          await kvCache.set(cacheKey, createCacheEntry(freshData), CACHE_TTL_SECONDS)
        } finally {
          refreshGuards.delete(cacheKey)
        }
      })()

      refreshGuards.set(cacheKey, refreshPromise)

      kvCache.runBackgroundRefresh(request, () => refreshPromise)
    }
  }

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": CACHE_CONTROL_HEADER,
    },
  })
}
