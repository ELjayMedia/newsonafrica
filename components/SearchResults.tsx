"use client"

import React, { useState, useCallback } from "react"

interface SearchResultItem {
  id: string
  title: string
  description: string
  link: string
}

interface SearchResultsProps {
  query: string
}

const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      setSearchError(null)
      return
    }

    setIsLoading(true)
    setSearchError(null)

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many search requests. Please try again in a moment.")
        } else {
          throw new Error(`Search failed with status: ${response.status}`)
        }
      }

      const data = await response.json()
      setResults(data.items || [])
      setSearchError(null)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
      setSearchError(error instanceof Error ? error.message : "An error occurred during search")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (query) {
      handleSearch(query)
    } else {
      setResults([])
    }
  }, [query, handleSearch])

  return (
    <div>
      {searchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{searchError}</p>
          <p className="text-sm mt-1">Try refreshing the page or searching again later.</p>
        </div>
      )}
      {isLoading ? (
        <p>Loading...</p>
      ) : results.length > 0 ? (
        <ul>
          {results.map((item) => (
            <li key={item.id} className="mb-4">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                <h3 className="text-lg font-semibold">{item.title}</h3>
              </a>
              <p className="text-gray-700">{item.description}</p>
            </li>
          ))}
        </ul>
      ) : query && !isLoading ? (
        <p>No results found for "{query}"</p>
      ) : null}
    </div>
  )
}

export default SearchResults
