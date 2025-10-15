import { NextResponse } from "next/server"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import { getLatestPostsForCountry, mapPostsToHomePosts } from "@/lib/wordpress-api"
import type { PanAfricanSpotlightPayload } from "@/types/home"

const DEFAULT_LIMIT = 2

export const runtime = "nodejs"
export const revalidate = 60

const parseLimit = (value: string | null, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const country = url.searchParams.get("country")?.toLowerCase()
  const limit = parseLimit(url.searchParams.get("limit"), DEFAULT_LIMIT)

  if (!country) {
    return NextResponse.json({ error: "Missing country parameter" }, { status: 400 })
  }

  try {
    const latest = await getLatestPostsForCountry(country, limit)
    const posts = mapPostsToHomePosts(latest?.posts ?? [], country)

    const payload: PanAfricanSpotlightPayload = { country, posts }
    const response = NextResponse.json(payload)

    const cacheTags = buildCacheTags({ country, section: "news", extra: ["type:pan-african-spotlight"] })
    if (cacheTags.length > 0) {
      response.headers.set("x-next-cache-tags", cacheTags.join(","))
    }

    response.headers.set(
      "Cache-Control",
      `s-maxage=${revalidate}, stale-while-revalidate=${Math.floor(revalidate / 2)}`,
    )

    return response
  } catch (error) {
    console.error("[pan-african-spotlight] Failed to load spotlight posts", error)
    return NextResponse.json({ error: "Failed to load spotlight posts" }, { status: 500 })
  }
}
