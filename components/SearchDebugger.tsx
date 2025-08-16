"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SearchDebugger() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log("Testing search API with query:", query)

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
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

      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query..."
          onKeyDown={(e) => e.key === "Enter" && testSearch()}
        />
        <Button onClick={testSearch} disabled={loading}>
          {loading ? "Testing..." : "Test Search"}
        </Button>
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
              {results.results.slice(0, 3).map((post: any, index: number) => (
                <div key={index} className="p-2 bg-white border rounded text-sm">
                  <div className="font-medium">{post.title?.rendered || "No title"}</div>
                  <div className="text-gray-600 text-xs">
                    {post.excerpt?.rendered?.replace(/<[^>]*>/g, "").slice(0, 100) || "No excerpt"}...
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
