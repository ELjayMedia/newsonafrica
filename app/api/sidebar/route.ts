import { NextRequest, NextResponse } from "next/server"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import { DEFAULT_COUNTRY } from "@/lib/wordpress-api"
import {
  DEFAULT_SIDEBAR_MOST_READ_LIMIT,
  DEFAULT_SIDEBAR_RECENT_LIMIT,
  fetchSidebarContent,
} from "@/lib/sidebar"
import type { SidebarContentPayload } from "@/types/sidebar"

const DEFAULT_RECENT_LIMIT = DEFAULT_SIDEBAR_RECENT_LIMIT
const DEFAULT_MOST_READ_LIMIT = DEFAULT_SIDEBAR_MOST_READ_LIMIT

export const runtime = "nodejs"
export const revalidate = 180

const parseLimit = (value: string | null, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const country = (url.searchParams.get("country") || DEFAULT_COUNTRY).toLowerCase()
  const recentLimit = parseLimit(url.searchParams.get("recentLimit"), DEFAULT_RECENT_LIMIT)
  const mostReadLimit = parseLimit(url.searchParams.get("mostReadLimit"), DEFAULT_MOST_READ_LIMIT)

  try {
    const payload = await fetchSidebarContent({
      country,
      recentLimit,
      mostReadLimit,
      requestUrl: request.url,
    })

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
