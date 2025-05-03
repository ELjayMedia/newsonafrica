"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { search } from "@/lib/search"
import { HorizontalCard } from "@/components/HorizontalCard"
import { Skeleton } from "@/components/ui/skeleton"

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
}

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [totalHits, setTotalHits] = useState(0)

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)

      if (!query) {
        setResults([])
        setTotalHits(0)
        setLoading(false)
        return
      }

      try {
        const { hits, nbHits } = await search(query, { hitsPerPage: 20 })
        setResults(hits)
        setTotalHits(nbHits)
      } catch (error) {
        console.error("Search failed:", error)
        setResults([])
        setTotalHits(0)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  if (loading) {
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

  return (
    <div className="search-results">
      {results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Found {totalHits} results for "{query}"
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((post) => (
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
        </>
      ) : (
        <p className="text-center py-8">No results found for "{query}".</p>
      )}
    </div>
  )
}
