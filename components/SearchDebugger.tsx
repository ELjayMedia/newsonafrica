"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import type { AlgoliaSearchRecord } from "@/lib/algolia/client"

export function SearchDebugger() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState("all")
  const [sort, setSort] = useState<"relevance" | "latest">("relevance")

  const testSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log("Testing search API with query:", query)

      const params = new URLSearchParams({ q: query, country, sort })
      const response = await fetch(`/api/search?${params.toString()}`)
      console.log("Response status:", response.status)

      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      setResults(data)
    } catch (err) {
      console.error("Search test error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-4">Search API Debugger</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query..."
          onKeyDown={(e) => e.key === "Enter" && testSearch()}
          className="flex-1 min-w-[200px]"
        />
        <Button onClick={testSearch} disabled={loading}>
          {loading ? "Testing..." : "Test Search"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <span>Country:</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All / Pan-African</option>
            {SUPPORTED_COUNTRIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>Sort:</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as "relevance" | "latest")}
            className="border rounded px-2 py-1"
          >
            <option value="relevance">Relevance</option>
            <option value="latest">Latest</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Found {results.total || 0} results in {results.performance?.responseTime || 0}ms (Source:{" "}
            {results.performance?.source || "unknown"})
          </div>

          {results.results && results.results.length > 0 ? (
            <div className="space-y-2">
              {results.results.slice(0, 3).map((post: AlgoliaSearchRecord, index: number) => (
                <div key={index} className="p-2 bg-white border rounded text-sm">
                  <div className="font-medium">{post.title || "No title"}</div>
                  <div className="text-gray-600 text-xs">
                    {(post.excerpt || "").slice(0, 120) || "No excerpt"}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {post.country?.toUpperCase() || "N/A"} • {post.published_at || "Unknown"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}
