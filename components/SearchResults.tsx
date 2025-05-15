"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { search } from "@/lib/search"
import { HorizontalCard } from "@/components/HorizontalCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowUp, Filter } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"

interface SearchResult {
  objectID: string
  title: string
  excerpt: string
  slug: string
  featuredImage?: {
    node: {
      sourceUrl: string
    }
  }
  date: string
  author: {
    node: {
      name: string
    }
  }
  categories?: {
    node: {
      name: string
      slug: string
    }
  }[]
}

interface SearchState {
  results: SearchResult[]
  loading: boolean
  error: string | null
  totalHits: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

export function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const sort = searchParams.get("sort") || "relevance"
  const categories = searchParams.get("categories") || ""
  const tags = searchParams.get("tags") || ""

  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    totalHits: 0,
    currentPage: 0,
    totalPages: 0,
    hasMore: false,
  })

  const [showFilters, setShowFilters] = useState(false)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Function to update URL with search parameters
  const updateSearchParams = useCallback(
    (newParams: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove parameters
      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      router.push(`/search?${params.toString()}`)
    },
    [router, searchParams],
  )

  // Function to fetch search results
  const fetchResults = useCallback(
    async (page = 0, append = false) => {
      if (!debouncedQuery) {
        setSearchState({
          results: [],
          loading: false,
          error: null,
          totalHits: 0,
          currentPage: 0,
          totalPages: 0,
          hasMore: false,
        })
        return
      }

      setSearchState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const { hits, nbHits, nbPages, error, isError } = await search(debouncedQuery, {
          page,
          hitsPerPage: 10,
          sort: sort as "relevance" | "date" | "title",
          categories,
          tags,
        })

        if (isError) {
          throw new Error(error)
        }

        setSearchState((prev) => ({
          results: append ? [...prev.results, ...hits] : hits,
          loading: false,
          error: null,
          totalHits: nbHits,
          currentPage: page,
          totalPages: nbPages,
          hasMore: page < nbPages - 1,
        }))
      } catch (error) {
        console.error("Search failed:", error)
        setSearchState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to perform search",
        }))
      }
    },
    [debouncedQuery, sort, categories, tags],
  )

  // Initial search and when search parameters change
  useEffect(() => {
    fetchResults(0, false)
  }, [fetchResults])

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    updateSearchParams({ sort: newSort })
  }

  // Handle load more
  const handleLoadMore = () => {
    if (searchState.hasMore && !searchState.loading) {
      fetchResults(searchState.currentPage + 1, true)
    }
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Render loading state
  if (searchState.loading && searchState.results.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  // Render error state
  if (searchState.error && searchState.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Search Error</h3>
        <p className="text-gray-600 mb-4">{searchState.error}</p>
        <Button onClick={() => fetchResults(0, false)}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="search-results" ref={resultsContainerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {searchState.results.length > 0 ? (
          <p className="text-sm text-gray-500">
            Found {searchState.totalHits} results for "{query}"
          </p>
        ) : (
          <p className="text-sm text-gray-500">No results found for "{query}"</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Newest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-medium mb-3">Filter Results</h3>
          {/* Filter UI would go here - simplified for this example */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => updateSearchParams({ categories: "" })}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {searchState.results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchState.results.map((post) => (
              <HorizontalCard
                key={post.objectID}
                post={{
                  id: post.objectID,
                  title: post.title,
                  excerpt: post.excerpt,
                  slug: post.slug,
                  featuredImage: post.featuredImage,
                  date: post.date,
                  author: post.author,
                }}
              />
            ))}
          </div>

          {searchState.hasMore && (
            <div className="mt-8 text-center">
              <Button onClick={handleLoadMore} disabled={searchState.loading} className="min-w-[200px]">
                {searchState.loading ? "Loading..." : "Load More Results"}
              </Button>
            </div>
          )}

          {searchState.results.length > 10 && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-4 h-10 w-10 rounded-full shadow-md"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No results found for "{query}".</p>
          <p className="text-sm text-gray-400">Try using different keywords or check your spelling.</p>
        </div>
      )}

      {/* Loading indicator for "load more" */}
      {searchState.loading && searchState.results.length > 0 && (
        <div className="mt-4 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
