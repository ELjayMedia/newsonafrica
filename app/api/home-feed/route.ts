import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { getAggregatedLatestHome, type AggregatedHomeData } from "@/lib/wordpress-api"
import { env } from "@/config/env"

export const runtime = "edge"
export const revalidate = 0

const HOME_FEED_CACHE_KEY = "home-feed:v1"
const HOME_FEED_TTL_MS = 45_000
const REFRESH_THRESHOLD_MS = 10_000

type CachedHomeFeed = {
  data: AggregatedHomeData
  expiresAt: number
}

let redisClient: Redis | null | undefined

const resolveRedis = (): Redis | null => {
  if (redisClient !== undefined) {
    return redisClient
  }

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null
    console.warn("[home-feed] Upstash credentials missing; falling back to direct fetch")
    return redisClient
  }

  redisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })

  return redisClient
}

const isCachedHomeFeed = (value: unknown): value is CachedHomeFeed => {
  if (!value || typeof value !== "object") {
    return false
  }
  const candidate = value as Partial<CachedHomeFeed>
  return Boolean(candidate.data && typeof candidate.expiresAt === "number")
}

async function refreshHomeFeed(client: Redis | null): Promise<AggregatedHomeData> {
  const data = await getAggregatedLatestHome(6)

  if (client) {
    const payload: CachedHomeFeed = {
      data,
      expiresAt: Date.now() + HOME_FEED_TTL_MS,
    }

    await client.set(HOME_FEED_CACHE_KEY, payload, { px: HOME_FEED_TTL_MS })
  }

  return data
}

export async function GET(): Promise<NextResponse> {
  const client = resolveRedis()

  if (!client) {
    const data = await getAggregatedLatestHome(6)
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  }

  try {
    const cached = await client.get<CachedHomeFeed>(HOME_FEED_CACHE_KEY)
    const now = Date.now()

    if (isCachedHomeFeed(cached)) {
      const timeRemaining = cached.expiresAt - now
      if (timeRemaining > 0) {
        if (timeRemaining <= REFRESH_THRESHOLD_MS) {
          refreshHomeFeed(client).catch((error) =>
            console.error("[home-feed] Background refresh failed", error),
          )
        }

        return NextResponse.json(cached.data, { headers: { "Cache-Control": "no-store" } })
      }

      try {
        const fresh = await refreshHomeFeed(client)
        return NextResponse.json(fresh, { headers: { "Cache-Control": "no-store" } })
      } catch (error) {
        console.error("[home-feed] Refresh failed; serving stale data", error)
        return NextResponse.json(cached.data, { headers: { "Cache-Control": "no-store" } })
      }
    }

    const fresh = await refreshHomeFeed(client)
    return NextResponse.json(fresh, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[home-feed] Redis lookup failed", error)
    const data = await getAggregatedLatestHome(6)
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  }
}
