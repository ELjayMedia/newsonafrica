import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { getSearchSuggestions } from "@/lib/supabase/search"

import { normalizeBaseSearchParams } from "../shared"

export const runtime = "edge"
export const revalidate = 30

const SUGGEST_CACHE_HEADER = "public, s-maxage=30, stale-while-revalidate=60"

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const normalizedParams = normalizeBaseSearchParams(searchParams)

  if (!normalizedParams.query) {
    const response = jsonWithCors(request, { suggestions: [] }, { status: 400 })
    response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
    return response
  }

  try {
    const edition = normalizedParams.scope.type === "country" ? normalizedParams.scope.country : undefined

    const suggestions = await getSearchSuggestions(normalizedParams.query, edition, 10)

    const response = jsonWithCors(request, {
      suggestions,
      performance: {
        responseTime: Date.now() - startTime,
        source: "supabase-fts",
      },
    })
    response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
    return response
  } catch (error) {
    console.error("[v0] Suggestion error:", error)
    const response = jsonWithCors(request, { suggestions: [] })
    response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
    return response
  }
}
