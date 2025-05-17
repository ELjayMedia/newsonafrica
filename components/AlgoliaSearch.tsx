"use client"

import { useState, useEffect } from "react"
import { searchAlgolia } from "@/lib/algolia-client"
import { useDebounce } from "@/hooks/useDebounce"
import Link from "next/link"
import Image from "next/image"

interface SearchResult {
  objectID: string
  id: string
  title: string
  slug: string
  excerpt: string
  publishDate: number
  featuredImage: string | null
  categories: string[]
  author: {
    name: string
    slug: string
  }
  _highlightResult?: {
    title: { value: string }
    excerpt: { value: string }
  }
}

export function AlgoliaSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalHits, setTotalHits] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([])
        setTotalHits(0)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build filters if category is selected
        const filters = selectedCategory ? `categories:"${selectedCategory}"` : undefined

        const searchResults = await searchAlgolia<SearchResult>({
          indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
          query: debouncedQuery.trim(),
          filters,
          hitsPerPage: 10,
        })

        if (searchResults.error) {
          setError(searchResults.error)
        } else {
          setResults(searchResults.hits)
          setTotalHits(searchResults.nbHits)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed")
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, selectedCategory])

  // Extract unique categories from results for filtering
  const categories = [...new Set(results.flatMap((result) => result.categories))]

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

      {/* Loading state */}
      {loading && (
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
        </div>
      )}

      {/* Results */}
      {!loading && !error && debouncedQuery && (
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-4">
            {totalHits} result{totalHits !== 1 ? "s" : ""} for "{debouncedQuery}"
          </p>

          <div className="space-y-6">
            {results.map((result) => (
              <Link
                href={`/post/${result.slug}`}
                key={result.objectID}
                className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {result.featuredImage && (
                    <div className="flex-shrink-0">
                      <Image
                        src={result.featuredImage || "/placeholder.svg"}
                        alt={result.title}
                        width={120}
                        height={80}
                        className="rounded object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3
                      className="text-lg font-semibold mb-1"
                      dangerouslySetInnerHTML={{
                        __html: result._highlightResult?.title?.value || result.title,
                      }}
                    />
                    <p
                      className="text-sm text-gray-600 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: result._highlightResult?.excerpt?.value || result.excerpt,
                      }}
                    />
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{result.author.name}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(result.publishDate).toLocaleDateString()}</span>
                      {result.categories.length > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{result.categories[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No results found for "{debouncedQuery}"</p>
              <p className="text-sm text-gray-500 mt-2">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
