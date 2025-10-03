"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { highlightSearchTerms } from "@/lib/search"
import { formatDistanceToNow } from "date-fns"
import { getArticleUrl } from "@/lib/utils/routing"
import type { AlgoliaSearchRecord } from "@/lib/algolia/client"

interface SearchResultsProps {
  results: AlgoliaSearchRecord[]
  query: string
  total: number
  currentPage: number
  totalPages: number
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  country?: string
}

const extractSlug = (objectID: string): { country?: string; slug: string } => {
  if (!objectID) {
    return { slug: objectID }
  }

  const [country, ...rest] = objectID.split(":")
  if (rest.length === 0) {
    return { slug: objectID }
  }

  return {
    country,
    slug: rest.join(":"),
  }
}

export function SearchResults({
  results,
  query,
  total,
  currentPage,
  totalPages,
  hasMore,
  isLoading,
  onLoadMore,
  country,
}: SearchResultsProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Searching...</p>
      </div>
    )
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500">
          We couldn't find any matches for "{query}". Please try a different search term or check your spelling.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-500">
        Found {total} {total === 1 ? "result" : "results"} for "{query}"
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const parsed = extractSlug(result.objectID)
          const resolvedCountry = result.country || parsed.country || country
          const slug = parsed.slug || result.objectID
          const href = getArticleUrl(slug, resolvedCountry)

          return (
            <div key={result.objectID} className="border-b border-gray-200 pb-4 last:border-0">
              <Link href={href} className="block group">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {isClient ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: highlightSearchTerms(result.title, query),
                      }}
                    />
                  ) : (
                    result.title
                  )}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                  <span>
                    {result.published_at
                      ? formatDistanceToNow(new Date(result.published_at), { addSuffix: true })
                      : "Unknown date"}
                  </span>
                  {resolvedCountry && <span className="uppercase">• {resolvedCountry}</span>}
                  {result.categories?.length > 0 && (
                    <span className="truncate">
                      • {result.categories.slice(0, 3).join(", ")}
                      {result.categories.length > 3 ? "…" : ""}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-gray-600">
                  {isClient ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: highlightSearchTerms(result.excerpt.slice(0, 220), query),
                      }}
                    />
                  ) : (
                    result.excerpt.slice(0, 220)
                  )}
                  {result.excerpt.length > 220 ? "…" : ""}
                </p>
              </Link>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={onLoadMore} disabled={isLoading} variant="outline" className="min-w-[120px] bg-transparent">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="text-sm text-center text-gray-500 pt-2">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </div>
  )
}
