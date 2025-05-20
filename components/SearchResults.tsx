"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { HorizontalCard } from "@/components/HorizontalCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowUp, Filter, RefreshCw, Calendar, Tag, Layers, Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import {
  performSearch,
  createDebouncedSearch,
  formatExcerpt,
  highlightSearchTerms,
  type SearchFilters,
} from "@/lib/search"
import { SearchForm } from "@/components/SearchForm"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { search, type SearchResult, type SearchParams } from "@/lib/search"

// Add this near the top of the file, outside the component
const MemoizedHorizontalCard = memo(HorizontalCard)

// Create debounced search function
const debouncedSearch = createDebouncedSearch(300)

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || initialQuery
  const debouncedQuery = useDebounce(query, 300)

  // Get filters from URL
  const sort = searchParams.get("sort") || "relevance"
  const categories = searchParams.get("categories") || ""
  const tags = searchParams.get("tags") || ""
  const dateFrom = searchParams.get("dateFrom") || ""
  const dateTo = searchParams.get("dateTo") || ""
  const fuzzy = searchParams.get("fuzzy") === "true"
  const fuzzyThreshold = Number.parseFloat(searchParams.get("fuzzyThreshold") || "0.3")

  // State
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchSource, setSearchSource] = useState<"graphql" | "rest" | "fuzzy" | "unknown">("unknown")
  const [retryCount, setRetryCount] = useState(0)
  const [showFuzzySettings, setShowFuzzySettings] = useState(false)
  const [fuzzySearch, setFuzzySearch] = useState(fuzzy)
  const [fuzzyThresholdState, setFuzzyThresholdState] = useState(fuzzyThreshold)
  const debouncedFuzzyThreshold = useDebounce(fuzzyThresholdState, 300)

  // Refs
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setLoading(true)
      setError(null)

      // Collect filters
      const filters: SearchFilters = {
        sort: sort as "relevance" | "date" | "title",
        fuzzy,
        fuzzyThreshold,
      }

      if (categories) filters.categories = categories
      if (tags) filters.tags = tags
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo

      try {
        // Perform search with abort signal
        const response = await performSearch(debouncedQuery, searchPage, filters, signal)

        // If aborted, don't update state
        if (signal.aborted) return

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
          setSearchSource(response.searchSource as "graphql" | "rest" | "fuzzy" | "unknown")
        }

        // Update state with search results
        setResults((prev) => (append ? [...prev, ...response.items] : response.items))
        setTotalItems(response.pagination.totalItems)
        setTotalPages(response.pagination.totalPages)
        setHasMore(response.pagination.hasMore)
        setPage(searchPage)
        setIsRateLimited(false)
      } catch (err) {
        // Don't update error state if request was aborted
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Search request aborted")
          return
        }

        console.error("Search error:", err)
        setError(err instanceof Error ? err.message : "Failed to perform search")
      } finally {
        // Only update loading state if the request wasn't aborted
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [debouncedQuery, sort, categories, tags, dateFrom, dateTo, fuzzy, fuzzyThreshold],
  )

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setTotalPages(0)
        return
      }

      setLoading(true)

      const searchParams: SearchParams = {
        query: debouncedQuery,
        page,
        perPage: 10,
        fuzzySearch,
        fuzzyThreshold: debouncedFuzzyThreshold,
      }

      try {
        const { results: searchResults, totalPages: pages } = await search(searchParams)
        setResults(searchResults)
        setTotalPages(pages)
      } catch (error) {
        console.error("Error fetching search results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery, page, fuzzySearch, debouncedFuzzyThreshold])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Fetch results when search parameters change
  useEffect(() => {
    fetchResults(1, false)

    // Clean up any pending retry timeouts and abort any in-flight requests
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchResults, retryCount])

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    updateSearchParams({ sort: newSort })
  }

  // Handle fuzzy search toggle
  const handleFuzzyToggle = (enabled: boolean) => {
    updateSearchParams({
      fuzzy: enabled ? "true" : "false",
      page: "1", // Reset to first page
    })
    setFuzzySearch(enabled)
  }

  // Handle fuzzy threshold change
  const handleFuzzyThresholdChange = (value: number[]) => {
    updateSearchParams({
      fuzzyThreshold: value[0].toString(),
      page: "1", // Reset to first page
    })
    setFuzzyThresholdState(value[0])
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
    setRetryCount((prev) => prev + 1)
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Handle search form submission
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      updateSearchParams({ query: searchQuery, page: "1" })
    }
  }

  // Format excerpt with highlighted search terms
  const formatExcerptWithHighlight = (excerpt: string) => {
    const plainExcerpt = formatExcerpt(excerpt)
    return fuzzy
      ? plainExcerpt // Don't highlight for fuzzy search as matches might be approximate
      : highlightSearchTerms(plainExcerpt, query)
  }

  // Render loading state
  if (loading && results.length === 0) {
    return (
      <div className="space-y-6">
        <div className="w-full max-w-4xl mx-auto mb-6">
          <SearchForm initialQuery={query} onSearch={handleSearch} autoFocus />
        </div>
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
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <SearchForm initialQuery={query} onSearch={handleSearch} />
        </div>
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
      </div>
    )
  }

  // Render general error
  if (error && results.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <SearchForm initialQuery={query} onSearch={handleSearch} />
        </div>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Search Error</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{error}</p>
            <Button onClick={() => setRetryCount((prev) => prev + 1)}>Try Again</Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="search-results w-full max-w-4xl mx-auto" ref={resultsContainerRef}>
      {/* Search form */}
      <div className="mb-6">
        <SearchForm initialQuery={query} onSearch={handleSearch} autoFocus />

        {/* Fuzzy search toggle */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="fuzzy-search" checked={fuzzySearch} onCheckedChange={handleFuzzyToggle} />
            <Label htmlFor="fuzzy-search" className="flex items-center cursor-pointer">
              <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Fuzzy Search</span>
            </Label>
            {fuzzySearch && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 h-6"
                onClick={() => setShowFuzzySettings(!showFuzzySettings)}
              >
                {showFuzzySettings ? "Hide Settings" : "Settings"}
              </Button>
            )}
          </div>

          {searchSource === "fuzzy" && <span className="text-xs text-blue-500">Using fuzzy matching</span>}
        </div>

        {/* Fuzzy search settings */}
        {fuzzySearch && showFuzzySettings && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="fuzzy-threshold">Fuzzy match threshold</Label>
                <span className="text-sm">{fuzzyThreshold.toFixed(1)}</span>
              </div>
              <Slider
                id="fuzzy-threshold"
                min={0.1}
                max={0.9}
                step={0.1}
                value={[fuzzyThresholdState]}
                onValueChange={handleFuzzyThresholdChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Exact</span>
                <span>Flexible</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search metadata and filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        {results.length > 0 ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Found {totalItems.toLocaleString()} {totalItems === 1 ? "result" : "results"} for "{query}"
            </p>
          </div>
        ) : query ? (
          <p className="text-sm text-gray-500">No results found for "{query}"</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 ${showFilters ? "bg-gray-100 dark:bg-gray-700" : ""}`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px] border-gray-200 dark:border-gray-700">
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
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="font-medium mb-4 text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span>Filter Results</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6">
            {results.map((post) => (
              <div key={post.id} className="group transition-all duration-200 hover:translate-y-[-2px]">
                <HorizontalCard
                  post={{
                    id: post.id,
                    title: post.title,
                    excerpt: formatExcerptWithHighlight(post.excerpt),
                    slug: post.slug,
                    featuredImage: post.featuredImage
                      ? { node: { sourceUrl: post.featuredImage.sourceUrl } }
                      : undefined,
                    date: post.date,
                    author: post.author ? { node: { name: post.author.name } } : undefined,
                  }}
                  className="border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                  allowHtml={true}
                />
              </div>
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="mt-10 text-center">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                className="min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Load More Results"
                )}
              </Button>
            </div>
          )}

          {/* Scroll to top button */}
          {results.length > 10 && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-4 h-10 w-10 rounded-full shadow-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 z-10"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </>
      ) : query ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="mb-4">
            <Search className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 mb-4 font-medium">No results found for "{query}".</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Try using different keywords, check your spelling, or{" "}
            {!fuzzySearch && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-blue-500"
                onClick={() => handleFuzzyToggle(true)}
              >
                enable fuzzy search
              </Button>
            )}
            {fuzzySearch && "try adjusting the fuzzy search settings"}.
          </p>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 mb-6 font-medium">Enter a search term to find articles.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["Politics", "Business", "Sports", "Entertainment", "Health"].map((term) => (
              <Button
                key={term}
                variant="outline"
                onClick={() => handleSearch(term)}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {term}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator for "load more" */}
      {loading && results.length > 0 && (
        <div className="mt-6 space-y-4 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-700">
              {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
