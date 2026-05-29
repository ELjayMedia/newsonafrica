import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { getSearchSuggestions } from "@/lib/wordpress-search"

import { DEFAULT_COUNTRY, normalizeBaseSearchParams } from "../shared"
import { executeWordPressSearchForScope } from "../wordpress-fallback"

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
    if (normalizedParams.scope.type === "panAfrican") {
      const result = await executeWordPressSearchForScope(normalizedParams.query, normalizedParams.scope, 1, 10)
      const response = jsonWithCors(request, {
        suggestions: result.suggestions,
        performance: {
          responseTime: Date.now() - startTime,
          source: "graphql",
          ...result.performance,
        },
      })
      response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
      return response
    }

    const country = normalizedParams.scope.type === "country" ? normalizedParams.scope.country : DEFAULT_COUNTRY
    const suggestions = await getSearchSuggestions(normalizedParams.query, 10, country)

    const response = jsonWithCors(request, {
      suggestions,
      performance: {
        responseTime: Date.now() - startTime,
        source: "graphql",
      },
    })
    response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
    return response
  } catch (error) {
    console.error("Suggestion error:", error)
    const response = jsonWithCors(request, { suggestions: [] })
    response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
    return response
  }
}
