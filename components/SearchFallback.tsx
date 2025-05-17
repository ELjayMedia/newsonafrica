"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

interface FallbackSearchProps {
  query: string
}

// This is a simplified fallback search implementation
export function SearchFallback({ query }: FallbackSearchProps) {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFallbackResults() {
      setLoading(true)
      try {
        // Attempt to fetch results from WordPress directly
        // This is a fallback in case Algolia is down
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)

        if (response.ok) {
          const data = await response.json()
          setResults(data.posts || [])
        } else {
          console.error("Fallback search failed")
          setResults([])
        }
      } catch (error) {
        console.error("Error in fallback search:", error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchFallbackResults()
  }, [query])

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <input
          type="search"
          value={query}
          readOnly
          className="w-full p-4 pl-12 border rounded-lg shadow-sm"
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

      <div className="mt-4 bg-amber-50 p-3 rounded-md border border-amber-200">
        <p className="text-amber-800">Enhanced search is currently unavailable. Showing basic results instead.</p>
      </div>

      {loading ? (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Searching...</p>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-4">
            {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
          </p>

          {results.length > 0 ? (
            <div className="space-y-6">
              {results.map((post) => (
                <Link
                  href={`/post/${post.slug}`}
                  key={post.id}
                  className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {post.featuredImage && (
                      <div className="flex-shrink-0">
                        <Image
                          src={post.featuredImage || "/placeholder.svg"}
                          alt={post.title}
                          width={120}
                          height={80}
                          className="rounded object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{post.author?.name || "Unknown"}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(post.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No results found for "{query}"</p>
              <p className="text-sm text-gray-500 mt-2">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
