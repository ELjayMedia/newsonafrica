"use client"

import { useState, useEffect } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import Link from "next/link"
import Image from "next/image"

interface Author {
  name: string
  slug: string
}

interface Category {
  name: string
  slug: string
}

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string
  date: string
  featuredImage?: {
    sourceUrl: string
    altText?: string
  }
  author: Author
  categories: Category[]
}

interface SearchResponse {
  search: {
    edges: SearchResult[]
    pageInfo: {
      hasNextPage: boolean
      endCursor: string
    }
    totalCount: number
  }
}

export function GraphQLSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  // Reset pagination when query changes
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, selectedCategory])

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([])
        setTotalCount(0)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build GraphQL query
        const graphqlQuery = {
          query: `
            query SearchPosts($query: String!, $limit: Int, $offset: Int, $category: String) {
              search(query: $query, limit: $limit, offset: $offset) {
                edges {
                  id
                  title
                  slug
                  excerpt
                  date
                  featuredImage {
                    sourceUrl
                    altText
                  }
                  author {
                    name
                    slug
                  }
                  categories {
                    name
                    slug
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
                totalCount
              }
            }
          `,
          variables: {
            query: debouncedQuery.trim(),
            limit: 10,
            offset: (page - 1) * 10,
            category: selectedCategory,
          },
        }

        // Execute GraphQL query
        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(graphqlQuery),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Search failed: ${errorText}`)
        }

        const data = await response.json()

        if (data.errors) {
          throw new Error(data.errors[0].message || "GraphQL error")
        }

        const searchData = data.data as SearchResponse

        // If it's the first page, replace results; otherwise append
        if (page === 1) {
          setResults(searchData.search.edges)
        } else {
          setResults((prev) => [...prev, ...searchData.search.edges])
        }

        setTotalCount(searchData.search.totalCount)
        setHasNextPage(searchData.search.pageInfo.hasNextPage)
      } catch (err) {
        console.error("Search error:", err)
        setError(err instanceof Error ? err.message : "Search failed")
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, selectedCategory, page])

  // Extract unique categories from results for filtering
  const categories = Array.from(new Set(results.flatMap((result) => result.categories.map((cat) => cat.name))))

  const loadMore = () => {
    if (hasNextPage && !loading) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news articles..."
          className="w-full p-4 pl-12 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search news articles"
        />
        <svg
          className="absolute left-4 top-4 h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-sm rounded-full ${
              selectedCategory === null ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedCategory === category ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Loading state - initial load */}
      {loading && results.length === 0 && (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Searching...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-lg">
          <p className="font-medium">Search error</p>
          <p>{error}</p>
          <button onClick={() => setQuery("")} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
            Clear search
          </button>
        </div>
      )}

      {/* Results */}
      {!error && debouncedQuery && results.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-4">
            {totalCount} result{totalCount !== 1 ? "s" : ""} for "{debouncedQuery}"
          </p>

          <div className="space-y-6">
            {results.map((result) => (
              <Link
                href={`/post/${result.slug}`}
                key={result.id}
                className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {result.featuredImage?.sourceUrl && (
                    <div className="flex-shrink-0">
                      <Image
                        src={result.featuredImage.sourceUrl || "/placeholder.svg"}
                        alt={result.featuredImage.altText || result.title}
                        width={120}
                        height={80}
                        className="rounded object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{result.title}</h3>
                    <p
                      className="text-sm text-gray-600 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: result.excerpt,
                      }}
                    />
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{result.author.name}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(result.date).toLocaleDateString()}</span>
                      {result.categories.length > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{result.categories[0].name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Load more button */}
          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading more..." : "Load more results"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {!loading && !error && debouncedQuery && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No results found for "{debouncedQuery}"</p>
          <p className="text-sm text-gray-500 mt-2">Try different keywords or check your spelling</p>
        </div>
      )}

      {/* Loading state - load more */}
      {loading && results.length > 0 && (
        <div className="mt-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-1 text-sm text-gray-600">Loading more results...</p>
        </div>
      )}
    </div>
  )
}
