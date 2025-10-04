"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SearchBox } from "./SearchBox"
import { SearchResults } from "./SearchResults"
import type { AlgoliaSearchRecord } from "@/lib/algolia/client"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"

interface SearchContentProps {
  initialQuery?: string
}

export function SearchContent({ initialQuery = "" }: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [results, setResults] = useState<AlgoliaSearchRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentQuery, setCurrentQuery] = useState(initialQuery)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [country, setCountry] = useState(() => searchParams.get("country") || "all")
  const [sort, setSort] = useState<"relevance" | "latest">(
    (searchParams.get("sort") === "latest" ? "latest" : "relevance") as "relevance" | "latest",
  )

  const normalizedCountry = country?.toLowerCase() || "all"
  const isSupportedCountry = SUPPORTED_COUNTRIES.some((entry) => entry.code === normalizedCountry)
  const effectiveCountry = isSupportedCountry ? normalizedCountry : "all"

  // Perform search
  const performSearch = useCallback(
    async (query: string, page = 1, append = false, countryParam = effectiveCountry, sortParam = sort) => {
      if (!query.trim()) {
        setResults([])
        setTotal(0)
        setHasSearched(false)
        return
      }

      setIsLoading(true)
      console.log(`Performing search for: "${query}", page: ${page}, append: ${append}`)

      try {
        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          per_page: "20",
        })

        if (countryParam && countryParam !== "all") {
          params.set("country", countryParam)
        } else {
          params.set("country", "all")
        }

        params.set("sort", sortParam)

        const response = await fetch(`/api/search?${params.toString()}`)
        console.log(`Search API response status: ${response.status}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Search API error:", errorData)
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("Search API response data:", data)

        // Handle the response format from our API
        if (append) {
          setResults((prev) => [...prev, ...((data.results as AlgoliaSearchRecord[]) || [])])
        } else {
          setResults((data.results as AlgoliaSearchRecord[]) || [])
        }

        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
        setCurrentPage(data.currentPage || page)
        setHasMore(data.hasMore || false)
        setHasSearched(true)

        console.log(`Search completed: ${data.results?.length || 0} results found`)
      } catch (error) {
        console.error("Search error:", error)
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
    },
    [effectiveCountry, sort],
  )

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

      if (effectiveCountry) {
        params.set("country", effectiveCountry)
      } else {
        params.delete("country")
      }

      params.set("sort", sort)

      const newUrl = params.toString() ? `/search?${params.toString()}` : "/search"
      router.replace(newUrl, { scroll: false })

      if (query.trim()) {
        performSearch(query, 1, false, effectiveCountry, sort)
      } else {
        setResults([])
        setTotal(0)
        setHasSearched(false)
      }
    },
    [router, searchParams, performSearch, effectiveCountry, sort],
  )

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && currentQuery) {
      performSearch(currentQuery, currentPage + 1, true, effectiveCountry, sort)
    }
  }, [hasMore, isLoading, currentQuery, currentPage, performSearch, effectiveCountry, sort])

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get("q") || ""
    const urlPage = Number.parseInt(searchParams.get("page") || "1", 10)
    const urlCountry = searchParams.get("country") || "all"
    const urlSort = searchParams.get("sort") === "latest" ? "latest" : "relevance"

    if (urlQuery && urlQuery !== currentQuery) {
      setCurrentQuery(urlQuery)
      performSearch(urlQuery, urlPage, false, urlCountry, urlSort)
    }

    if (urlCountry !== country) {
      setCountry(urlCountry)
    }

    if (urlSort !== sort) {
      setSort(urlSort)
    }
  }, [searchParams, currentQuery, performSearch, country, sort])

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
          country={effectiveCountry}
          sort={sort}
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
            country={effectiveCountry}
          />
        </div>
      )}

      {/* No search performed yet */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-300 text-lg mb-2">Start searching</div>
          <p className="text-gray-600 dark:text-gray-300">Enter a search term above to find articles, categories, and tags</p>
        </div>
      )}
    </div>
  )
}
