import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import {
  resolveSearchIndex,
  type AlgoliaSearchRecord,
} from "@/lib/algolia/client"
import { getSearchSuggestions as wpGetSearchSuggestions } from "@/lib/wordpress-search"

import { normalizeBaseSearchParams, type NormalizedBaseSearchParams } from "../shared"
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

const normalizeSuggestions = (hits: AlgoliaSearchRecord[]): string[] =>
  Array.from(new Set(hits.map((hit) => hit.title).filter((title): title is string => Boolean(title))))
    .slice(0, SUGGESTION_LIMIT)

const fetchWordPressSuggestions = async (
  params: NormalizedBaseSearchParams,
): Promise<SuggestionResponse> => {
  if (params.scope.type === "panAfrican") {
    const fallback = await executeWordPressSearchForScope(
      params.query,
      params.scope,
      1,
      SUGGESTION_LIMIT,
    )

    return {
      suggestions: fallback.suggestions.slice(0, SUGGESTION_LIMIT),
      performance: {
        responseTime: fallback.performance.elapsedMs,
        source: "wordpress-fallback",
      },
    }
  }

  const suggestions = await wpGetSearchSuggestions(
    params.query,
    SUGGESTION_LIMIT,
    params.scope.type === "country" ? params.scope.country : undefined,
  )

  return {
    suggestions,
    performance: {
      responseTime: 0,
      source: "wordpress-fallback",
    },
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

  const searchIndex = resolveSearchIndex(normalizedParams.scope, normalizedParams.sort)

  if (!searchIndex) {
    try {
      const fallback = await fetchWordPressSuggestions(normalizedParams)
      return respondWithSuggestions(request, {
        suggestions: fallback.suggestions,
        performance: {
          responseTime: fallback.performance?.responseTime ?? Date.now() - startTime,
          source: fallback.performance?.source ?? "wordpress-fallback",
        },
      })
    } catch (error) {
      console.error("WordPress suggestion fallback failed", error)
      return respondWithSuggestions(request, { suggestions: [] })
    }
  }

  try {
    const response = await searchIndex.search<AlgoliaSearchRecord>(normalizedParams.query, {
      page: 0,
      hitsPerPage: SUGGESTION_LIMIT,
      attributesToRetrieve: ["title"],
    })

    return respondWithSuggestions(request, {
      suggestions: normalizeSuggestions(response.hits as AlgoliaSearchRecord[]),
      performance: {
        responseTime: Date.now() - startTime,
        source: `algolia-${normalizedParams.sort}`,
      },
    })
  } catch (error) {
    console.error("Algolia suggestion search failed", error)

    try {
      const fallback = await fetchWordPressSuggestions(normalizedParams)
      return respondWithSuggestions(request, {
        suggestions: fallback.suggestions,
        performance: {
          responseTime: fallback.performance?.responseTime ?? Date.now() - startTime,
          source: fallback.performance?.source ?? "wordpress-fallback",
        },
      })
    } catch (fallbackError) {
      console.error("WordPress suggestion fallback failed after Algolia error", fallbackError)
      return respondWithSuggestions(request, { suggestions: [] })
    }
  }
}
