"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SearchBox } from "./SearchBox"
import { SearchResults } from "./SearchResults"
import { createDebouncedSearch, type SearchPost } from "@/lib/search"

interface SearchContentProps {
  initialQuery?: string
}

export function SearchContent({ initialQuery = "" }: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [results, setResults] = useState<SearchPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentQuery, setCurrentQuery] = useState(initialQuery || "")
  const [hasSearched, setHasSearched] = useState(false)

  // Create debounced search function
  const debouncedSearch = useCallback(createDebouncedSearch(300), [])

  // Handle search results
  const handleSearchResults = useCallback(
    (searchResults: { results: SearchPost[]; total: number; query: string }) => {
      setResults(searchResults.results)
      setTotal(searchResults.total)
      setIsLoading(false)
      setHasSearched(true)
      setCurrentQuery(searchResults.query)

      // Update URL with search query
      if (searchResults.query) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("query", searchResults.query)
        router.replace(`/search?${params.toString()}`, { scroll: false })
      } else {
        // Clear URL query parameter
        const params = new URLSearchParams(searchParams.toString())
        params.delete("query")
        const newUrl = params.toString() ? `/search?${params.toString()}` : "/search"
        router.replace(newUrl, { scroll: false })
      }
    },
    [router, searchParams],
  )

  // Handle search input changes
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim().length === 0) {
        setResults([])
        setTotal(0)
        setIsLoading(false)
        setHasSearched(false)
        setCurrentQuery("")

        // Clear URL query parameter
        const params = new URLSearchParams(searchParams.toString())
        params.delete("query")
        const newUrl = params.toString() ? `/search?${params.toString()}` : "/search"
        router.replace(newUrl, { scroll: false })
        return
      }

      if (query.trim().length >= 2) {
        setIsLoading(true)
        setCurrentQuery(query.trim())
        debouncedSearch(query.trim(), handleSearchResults, { limit: 20 })
      }
    },
    [debouncedSearch, handleSearchResults, router, searchParams],
  )

  // Initialize search from URL parameters
  useEffect(() => {
    const urlQuery = searchParams.get("query") || ""
    if (urlQuery && urlQuery !== currentQuery) {
      setCurrentQuery(urlQuery)
      if (urlQuery.trim().length >= 2) {
        setIsLoading(true)
        debouncedSearch(urlQuery.trim(), handleSearchResults, { limit: 20 })
      }
    }
  }, [searchParams, currentQuery, debouncedSearch, handleSearchResults])

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <SearchBox
          onSearch={handleSearch}
          placeholder="Search articles by title, excerpt, or content..."
          initialValue={initialQuery}
          className="w-full"
        />
      </div>

      {/* Search Results */}
      <SearchResults
        posts={results}
        query={currentQuery}
        total={total}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />
    </div>
  )
}
