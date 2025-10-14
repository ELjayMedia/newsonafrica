import { NextRequest, NextResponse } from "next/server"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import { DEFAULT_COUNTRY, fetchMostReadPosts, fetchRecentPosts } from "@/lib/wordpress-api"
import type { SidebarContentPayload } from "@/types/sidebar"

const DEFAULT_RECENT_LIMIT = 10
const DEFAULT_MOST_READ_LIMIT = 10

export const runtime = "nodejs"
export const revalidate = 180

const parseLimit = (value: string | null, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : []
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const country = (url.searchParams.get("country") || DEFAULT_COUNTRY).toLowerCase()
  const recentLimit = parseLimit(url.searchParams.get("recentLimit"), DEFAULT_RECENT_LIMIT)
  const mostReadLimit = parseLimit(url.searchParams.get("mostReadLimit"), DEFAULT_MOST_READ_LIMIT)

  try {
    const [recentResult, mostReadResult] = await Promise.allSettled([
      fetchRecentPosts(recentLimit, country),
      fetchMostReadPosts(country, mostReadLimit),
    ])

    const payload: SidebarContentPayload = {
      recent: recentResult.status === "fulfilled" ? normalizeArray(recentResult.value) : [],
      mostRead: mostReadResult.status === "fulfilled" ? normalizeArray(mostReadResult.value) : [],
    }

    const response = NextResponse.json(payload)

    const cacheTags = new Set<string>()
    const addTags = (tags: string[]) => tags.forEach((tag) => cacheTags.add(tag))

    addTags(buildCacheTags({ country, section: "sidebar", extra: ["type:recent"] }))
    addTags(buildCacheTags({ country, section: "sidebar", extra: ["type:most-read"] }))
    addTags(buildCacheTags({ country, section: "news" }))

    if (cacheTags.size > 0) {
      response.headers.set("x-next-cache-tags", Array.from(cacheTags).join(","))
    }

    response.headers.set(
      "Cache-Control",
      `s-maxage=${revalidate}, stale-while-revalidate=${Math.floor(revalidate / 2)}`,
    )

    return response
  } catch (error) {
    console.error("[sidebar] Failed to load sidebar content", error)
    return NextResponse.json({ error: "Failed to load sidebar content" }, { status: 500 })
  }
}
