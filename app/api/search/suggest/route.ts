import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { getSearchSuggestions as wpGetSearchSuggestions } from "@/lib/wordpress-search"

import { normalizeBaseSearchParams } from "../shared"
import { executeWordPressSearchForScope } from "../wordpress-fallback"

export const runtime = "edge"
export const revalidate = 30

const SUGGESTION_LIMIT = 10
const SUGGEST_CACHE_HEADER = "public, s-maxage=30, stale-while-revalidate=60"

type SuggestionResponse = {
  suggestions: string[]
  performance?: {
    responseTime: number
    source: string
  }
}

const respondWithSuggestions = (request: NextRequest, body: SuggestionResponse, init?: ResponseInit) => {
  const response = jsonWithCors(request, body, init)
  response.headers.set("Cache-Control", SUGGEST_CACHE_HEADER)
  return response
}

type SuggestionFetchResult = {
  suggestions: string[]
  source: string
  elapsedMs?: number
}

const fetchWordPressSuggestions = async (
  params: ReturnType<typeof normalizeBaseSearchParams>,
): Promise<SuggestionFetchResult> => {
  if (params.scope.type === "panAfrican") {
    const fallback = await executeWordPressSearchForScope(params.query, params.scope, 1, SUGGESTION_LIMIT)

    return {
      suggestions: fallback.suggestions.slice(0, SUGGESTION_LIMIT),
      source: "graphql",
      elapsedMs: fallback.performance.elapsedMs,
    }
  }

  const start = Date.now()
  const suggestions = await wpGetSearchSuggestions(
    params.query,
    SUGGESTION_LIMIT,
    params.scope.type === "country" ? params.scope.country : undefined,
  )

  return {
    suggestions,
    source: "graphql",
    elapsedMs: Date.now() - start,
  }
}

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const normalizedParams = normalizeBaseSearchParams(searchParams)

  if (!normalizedParams.query) {
    return respondWithSuggestions(request, { suggestions: [] }, { status: 400 })
  }

  try {
    const result = await fetchWordPressSuggestions(normalizedParams)

    return respondWithSuggestions(request, {
      suggestions: result.suggestions,
      performance: {
        responseTime: result.elapsedMs ?? Date.now() - startTime,
        source: result.source,
      },
    })
  } catch (error) {
    console.error("GraphQL suggestion fetch failed", error)
  }

  return respondWithSuggestions(request, { suggestions: [] })
}
