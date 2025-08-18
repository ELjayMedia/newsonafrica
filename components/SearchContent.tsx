import logger from "@/utils/logger";
"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SearchBox } from "./SearchBox"
import { SearchResults } from "./SearchResults"
import type { WordPressSearchResult } from "@/lib/wordpress-search"

interface SearchContentProps {
  initialQuery?: string
}

export function SearchContent({ initialQuery = "" }: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [results, setResults] = useState<WordPressSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentQuery, setCurrentQuery] = useState(initialQuery)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Perform search
  const performSearch = useCallback(async (query: string, page = 1, append = false) => {
    if (!query.trim()) {
      setResults([])
      setTotal(0)
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    logger.info(`Performing search for: "${query}", page: ${page}, append: ${append}`)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&per_page=20`)
      logger.info(`Search API response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        logger.error("Search API error:", errorData)
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      logger.info("Search API response data:", data)

      // Handle the response format from our API
      if (append) {
        setResults((prev) => [...prev, ...(data.results || [])])
      } else {
        setResults(data.results || [])
      }

      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      setCurrentPage(data.currentPage || page)
      setHasMore(data.hasMore || false)
      setHasSearched(true)

      logger.info(`Search completed: ${data.results?.length || 0} results found`)
    } catch (error) {
      logger.error("Search error:", error)
      if (!append) {
        setResults([])
        setTotal(0)
        setTotalPages(0)
        setHasMore(false)
        setHasSearched(true) // Still mark as searched to show "no results"
      }
      // You could add a toast notification here to show the error to users
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setCurrentQuery(query)
      setCurrentPage(1)

      // Update URL
      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set("q", query)
        params.delete("page")
      } else {
        params.delete("q")
        params.delete("page")
      }

      const newUrl = params.toString() ? `/search?${params.toString()}` : "/search"
      router.replace(newUrl, { scroll: false })

      if (query.trim()) {
        performSearch(query, 1, false)
      } else {
        setResults([])
        setTotal(0)
        setHasSearched(false)
      }
    },
    [router, searchParams, performSearch],
  )

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && currentQuery) {
      performSearch(currentQuery, currentPage + 1, true)
    }
  }, [hasMore, isLoading, currentQuery, currentPage, performSearch])

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get("q") || ""
    const urlPage = Number.parseInt(searchParams.get("page") || "1", 10)

    if (urlQuery && urlQuery !== currentQuery) {
      setCurrentQuery(urlQuery)
      performSearch(urlQuery, urlPage, false)
    }
  }, [searchParams, currentQuery, performSearch])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Search box */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <SearchBox
          onSearch={handleSearch}
          placeholder="Search articles, categories, and tags..."
          initialValue={currentQuery}
          className="w-full"
          showSuggestions={true}
        />
      </div>

      {/* Search results */}
      {(hasSearched || isLoading) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <SearchResults
            results={results}
            query={currentQuery}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}

      {/* No search performed yet */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Start searching</div>
          <p className="text-gray-400">Enter a search term above to find articles, categories, and tags</p>
        </div>
      )}
    </div>
  )
}
