import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { resolveSearchIndex, type AlgoliaSearchRecord } from "@/lib/algolia/client"
import { getSearchSuggestions as wpGetSearchSuggestions } from "@/lib/wordpress-search"

import { normalizeBaseSearchParams } from "../shared"
import { executeWordPressSearchForScope } from "../wordpress"

export const runtime = "edge"
export const revalidate = 30

const jsonWithRevalidateCache = (request: NextRequest, data: any, init?: ResponseInit) => {
  const response = jsonWithCors(request, data, init)
  response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
  return response
}

export async function GET(request: NextRequest) {
  logRequest(request)
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const normalizedParams = normalizeBaseSearchParams(searchParams)

  if (!normalizedParams.query) {
    return jsonWithRevalidateCache(request, { error: "Missing search query" }, { status: 400 })
  }

  const scope = normalizedParams.scope
  const searchIndex = resolveSearchIndex(scope, normalizedParams.sort)

  if (!searchIndex) {
    if (scope.type === "panAfrican") {
      try {
        const fallback = await executeWordPressSearchForScope(normalizedParams.query, scope, 1, 10)
        return jsonWithRevalidateCache(request, {
          suggestions: fallback.suggestions,
          performance: {
            responseTime: Date.now() - startTime,
            source: "wordpress-fallback",
          },
        })
      } catch (error) {
        console.error("WordPress suggestion fallback failed", error)
        return jsonWithRevalidateCache(request, { suggestions: [] })
      }
    }

    try {
      const suggestions = await wpGetSearchSuggestions(
        normalizedParams.query,
        10,
        scope.type === "country" ? scope.country : undefined,
      )
      return jsonWithRevalidateCache(request, {
        suggestions,
        performance: {
          responseTime: Date.now() - startTime,
          source: "wordpress-fallback",
        },
      })
    } catch (error) {
      console.error("WordPress suggestion lookup failed", error)
      return jsonWithRevalidateCache(request, { suggestions: [] })
    }
  }

  try {
    const response = await searchIndex.search<AlgoliaSearchRecord>(normalizedParams.query, {
      page: 0,
      hitsPerPage: 10,
      attributesToRetrieve: ["title"],
    })

    const suggestions = Array.from(new Set(response.hits.map((hit) => hit.title))).slice(0, 10)

    return jsonWithRevalidateCache(request, {
      suggestions,
      performance: {
        responseTime: Date.now() - startTime,
        source: `algolia-${normalizedParams.sort}`,
      },
    })
  } catch (error) {
    console.error("Algolia suggestion search failed", error)

    try {
      const suggestions = await wpGetSearchSuggestions(
        normalizedParams.query,
        10,
        scope.type === "country" ? scope.country : undefined,
      )
      return jsonWithRevalidateCache(request, {
        suggestions,
        performance: {
          responseTime: Date.now() - startTime,
          source: "wordpress-fallback",
        },
      })
    } catch (wordpressError) {
      console.error("WordPress suggestion fallback failed", wordpressError)
      return jsonWithRevalidateCache(request, { suggestions: [] })
    }
  }
}
