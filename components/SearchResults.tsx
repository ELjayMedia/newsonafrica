"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { HorizontalCard } from "@/components/HorizontalCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowUp, Filter, RefreshCw, Calendar, Tag, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import { performSearch, createDebouncedSearch, formatExcerpt, type SearchFilters, type SearchItem } from "@/lib/search"

// Create debounced search function
const debouncedSearch = createDebouncedSearch(300)

export function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const debouncedQuery = useDebounce(query, 300)

  // Get filters from URL
  const sort = searchParams.get("sort") || "relevance"
  const categories = searchParams.get("categories") || ""
  const tags = searchParams.get("tags") || ""
  const dateFrom = searchParams.get("dateFrom") || ""
  const dateTo = searchParams.get("dateTo") || ""

  // State
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchSource, setSearchSource] = useState<"graphql" | "rest" | "unknown">("unknown")

  // Refs
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update URL with search parameters
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

  // Fetch search results
  const fetchResults = useCallback(
    async (searchPage = 1, append = false) => {
      // Don't search if query is empty
      if (!debouncedQuery) {
        setResults([])
        setTotalItems(0)
        setTotalPages(0)
        setHasMore(false)
        setError(null)
        setIsRateLimited(false)
        return
      }

      setLoading(true)
      setError(null)

      // Collect filters
      const filters: SearchFilters = {
        sort: sort as "relevance" | "date" | "title",
      }

      if (categories) filters.categories = categories
      if (tags) filters.tags = tags
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo

      try {
        // Perform search
        const response = await performSearch(debouncedQuery, searchPage, filters)

        // Check if response is an error
        if ("error" in response) {
          // Handle rate limiting
          if (response.error === "Rate limit exceeded") {
            setIsRateLimited(true)
            setRetryAfter(response.retryAfter || 60)

            // Set up automatic retry
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current)
            }

            retryTimeoutRef.current = setTimeout(
              () => {
                fetchResults(searchPage, append)
              },
              (response.retryAfter || 60) * 1000,
            )

            return
          }

          // Handle other errors
          throw new Error(response.message)
        }

        // Determine search source from response metadata (if available)
        if (response.searchSource) {
          setSearchSource(response.searchSource as "graphql" | "rest")
        }

        // Update state with search results
        setResults((prev) => (append ? [...prev, ...response.items] : response.items))
        setTotalItems(response.pagination.totalItems)
        setTotalPages(response.pagination.totalPages)
        setHasMore(response.pagination.hasMore)
        setPage(searchPage)
        setIsRateLimited(false)
      } catch (err) {
        console.error("Search error:", err)
        setError(err instanceof Error ? err.message : "Failed to perform search")
      } finally {
        setLoading(false)
      }
    },
    [debouncedQuery, sort, categories, tags, dateFrom, dateTo],
  )

  // Fetch results when search parameters change
  useEffect(() => {
    fetchResults(1, false)

    // Clean up any pending retry timeouts
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchResults])

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    updateSearchParams({ sort: newSort })
  }

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchResults(page + 1, true)
    }
  }

  // Handle retry
  const handleRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setIsRateLimited(false)
    fetchResults(page, false)
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Render loading state
  if (loading && results.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 mt-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render rate limit error
  if (isRateLimited) {
    return (
      <Alert variant="warning" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Search Temporarily Unavailable</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>Our search service is experiencing high demand. Please try again shortly.</p>
          <p className="text-sm">
            {retryAfter > 0
              ? `Automatically retrying in ${retryAfter} seconds...`
              : "We'll retry your search automatically."}
          </p>
          <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Now
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Render general error
  if (error && results.length === 0) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Search Error</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{error}</p>
          <Button onClick={() => fetchResults(1, false)}>Try Again</Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="search-results" ref={resultsContainerRef}>
      {/* Search metadata and filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {results.length > 0 ? (
          <div>
            <p className="text-sm text-gray-500">
              Found {totalItems.toLocaleString()} {totalItems === 1 ? "result" : "results"} for "{query}"
            </p>
            {searchSource !== "unknown" && (
              <p className="text-xs text-gray-400 mt-1">
                Results from WordPress {searchSource === "graphql" ? "GraphQL" : "REST API"}
              </p>
            )}
          </div>
        ) : query ? (
          <p className="text-sm text-gray-500">No results found for "{query}"</p>
        ) : null}

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

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6">
          <h3 className="font-medium mb-3">Filter Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                <span>Date Range</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateSearchParams({ dateFrom: e.target.value })}
                  className="text-sm"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateSearchParams({ dateTo: e.target.value })}
                  className="text-sm"
                  placeholder="To"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Layers className="h-4 w-4" />
                <span>Categories</span>
              </div>
              <Input
                type="text"
                value={categories}
                onChange={(e) => updateSearchParams({ categories: e.target.value })}
                className="text-sm"
                placeholder="Category IDs (comma separated)"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                <span>Tags</span>
              </div>
              <Input
                type="text"
                value={tags}
                onChange={(e) => updateSearchParams({ tags: e.target.value })}
                className="text-sm"
                placeholder="Tag IDs (comma separated)"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSearchParams({
                  categories: "",
                  tags: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Search results */}
      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((post) => (
              <HorizontalCard
                key={post.id}
                post={{
                  id: post.id,
                  title: post.title,
                  excerpt: formatExcerpt(post.excerpt),
                  slug: post.slug,
                  featuredImage: post.featuredImage ? { node: { sourceUrl: post.featuredImage.sourceUrl } } : undefined,
                  date: post.date,
                  author: { node: { name: post.author.name } },
                }}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <Button onClick={handleLoadMore} disabled={loading} className="min-w-[200px]">
                {loading ? "Loading..." : "Load More Results"}
              </Button>
            </div>
          )}

          {/* Scroll to top button */}
          {results.length > 10 && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-4 h-10 w-10 rounded-full shadow-md"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </>
      ) : query ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No results found for "{query}".</p>
          <p className="text-sm text-gray-400">Try using different keywords or check your spelling.</p>
        </div>
      ) : null}

      {/* Loading indicator for "load more" */}
      {loading && results.length > 0 && (
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
