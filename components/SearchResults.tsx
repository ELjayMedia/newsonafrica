"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatExcerpt, performSearch, type SearchFilters, type SearchItem, highlightSearchTerms } from "@/lib/search"
import { FALLBACK_POSTS } from "@/lib/mock-data"
import { Filter, SortAsc, Calendar, User, ChevronDown } from "lucide-react"

// Add more categories for better filtering
const CATEGORIES = [
  { id: 1, name: "Business", slug: "business" },
  { id: 2, name: "Culture", slug: "culture" },
  { id: 3, name: "Technology", slug: "technology" },
  { id: 4, name: "Sports", slug: "sports" },
  { id: 5, name: "Environment", slug: "environment" },
  { id: 6, name: "Fashion", slug: "fashion" },
  { id: 7, name: "Arts", slug: "arts" },
  { id: 8, name: "Health", slug: "health" },
  { id: 9, name: "Travel", slug: "travel" },
  { id: 10, name: "Entertainment", slug: "entertainment" },
  { id: 11, name: "Politics", slug: "politics" },
  { id: 12, name: "Education", slug: "education" },
]

export function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("query") || ""
  const categoryFilter = searchParams.get("category") || ""
  const [results, setResults] = useState<SearchItem[]>([])
  const [filteredResults, setFilteredResults] = useState<SearchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [searchSource, setSearchSource] = useState<string | undefined>(undefined)
  const resultsPerPage = 10

  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance")
  const [dateFilter, setDateFilter] = useState<string>("")

  // Function to fetch search results
  const fetchSearchResults = useCallback(
    async (currentPage: number) => {
      if (!query) {
        setResults([])
        setFilteredResults([])
        setIsLoading(false)
        return
      }

      try {
        setError(null)

        // Create filters object
        const filters: SearchFilters = {
          fuzzy: true,
        }

        if (categoryFilter) {
          filters.categories = categoryFilter
        }

        // Perform search
        const searchResponse = await performSearch(query, currentPage, filters)

        if ("error" in searchResponse) {
          setError(searchResponse.message)
          return
        }

        // Update state with search results
        if (currentPage === 1) {
          setResults(searchResponse.items)
          setFilteredResults(searchResponse.items)
        } else {
          setResults((prev) => [...prev, ...searchResponse.items])
          setFilteredResults((prev) => [...prev, ...searchResponse.items])
        }

        setTotalItems(searchResponse.pagination.totalItems)
        setHasMore(searchResponse.pagination.hasMore)
        setSearchSource(searchResponse.searchSource)
      } catch (err) {
        console.error("Search error:", err)
        setError("Failed to fetch search results. Please try again.")

        // Use fallback data if API fails
        const fallbackResults = FALLBACK_POSTS.filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.excerpt.toLowerCase().includes(query.toLowerCase()),
        )

        setResults(fallbackResults)
        setFilteredResults(fallbackResults)
        setSearchSource("fallback")
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [query, categoryFilter],
  )

  // Fetch results when query or category changes
  useEffect(() => {
    setIsLoading(true)
    setPage(1)
    fetchSearchResults(1)
  }, [query, categoryFilter, fetchSearchResults])

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true)
      const nextPage = page + 1
      setPage(nextPage)
      fetchSearchResults(nextPage)
    }
  }

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("category", category)
    router.push(`/search?${params.toString()}`)
  }

  // Handle category clear
  const handleCategoryClear = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("category")
    router.push(`/search?${params.toString()}`)
  }

  const handleSortChange = (newSort: "relevance" | "date" | "title") => {
    setSortBy(newSort)
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", newSort)
    router.push(`/search?${params.toString()}`)
  }

  const handleDateFilter = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    const dateString = date.toISOString().split("T")[0]

    const params = new URLSearchParams(searchParams.toString())
    params.set("dateFrom", dateString)
    router.push(`/search?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-red-500 mb-4">{error}</p>
          <p className="text-center text-muted-foreground">
            We encountered an error while searching. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (filteredResults.length === 0 && query) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No results found for "{query}"{categoryFilter ? ` in category "${categoryFilter}"` : ""}. Please try a
            different search term{categoryFilter ? " or category" : ""}.
          </p>
          {categoryFilter && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={handleCategoryClear}>
                Clear category filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {query && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Found {totalItems || filteredResults.length} results for "{query}"
            {categoryFilter ? ` in category "${categoryFilter}"` : ""}
            {searchSource && <span className="text-xs ml-2">({searchSource})</span>}
          </p>

          {/* Category filter dropdown */}
          <div className="flex gap-2">
            {categoryFilter && (
              <Button variant="outline" size="sm" onClick={handleCategoryClear}>
                Clear filter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Category pills */}
      {query && !categoryFilter && filteredResults.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.filter((category) =>
            filteredResults.some((result) =>
              result.categories.some((cat) => cat.slug === category.slug || cat.name === category.name),
            ),
          ).map((category) => (
            <Button
              key={category.id}
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => handleCategorySelect(category.slug)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {query && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>

          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="title">Title</option>
            </select>
          </div>

          {showFilters && (
            <div className="w-full mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDateFilter(7)} className="text-xs">
                Last 7 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDateFilter(30)} className="text-xs">
                Last 30 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDateFilter(90)} className="text-xs">
                Last 3 months
              </Button>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={`/post/${result.slug}`}
                className="flex gap-4 group hover:bg-muted p-3 rounded-lg transition-colors border border-transparent hover:border-gray-200"
              >
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={result.featuredImage?.sourceUrl || "/placeholder.svg?height=96&width=96&query=news"}
                    alt={result.featuredImage?.altText || result.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="font-semibold group-hover:text-primary transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerms(result.title, query),
                    }}
                  />
                  <p
                    className="text-sm text-muted-foreground line-clamp-2 mt-1"
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerms(formatExcerpt(result.excerpt), query),
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(result.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <User className="w-3 h-3" />
                    <span>{result.author.name}</span>
                    {result.categories && result.categories.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{result.categories[0].name}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading..." : "Load More Results"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
