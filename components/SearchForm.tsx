"use client"

import type React from "react"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

// Add these imports at the top:
import { getSearchSuggestions } from "@/lib/search"
import { Clock } from "lucide-react"

interface SearchFormProps {
  initialQuery?: string
  autoFocus?: boolean
}

export function SearchForm({ initialQuery = "", autoFocus = false }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  // Add these state variables after the existing ones:
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Set initial query from URL
  useEffect(() => {
    const urlQuery = searchParams.get("query") || ""
    if (urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [searchParams, query])

  // Auto focus input if needed
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Add this useEffect after the existing ones:
  useEffect(() => {
    // Load search history from localStorage
    if (typeof window !== "undefined") {
      const history = JSON.parse(localStorage.getItem("searchHistory") || "[]")
      const recentQueries = history
        .slice(-10)
        .map((item: any) => item.query)
        .filter((query: string, index: number, arr: string[]) => arr.indexOf(query) === index)
      setSearchHistory(recentQueries)
    }
  }, [])

  // Replace the existing handleSubmit function:
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    try {
      setIsSubmitting(true)
      const trimmedQuery = query.trim()

      // Save to search history
      if (typeof window !== "undefined") {
        const history = JSON.parse(localStorage.getItem("searchHistory") || "[]")
        const newSearch = {
          query: trimmedQuery,
          timestamp: Date.now(),
          resultsCount: 0,
        }
        history.push(newSearch)
        localStorage.setItem("searchHistory", JSON.stringify(history))
      }

      // Hide suggestions
      setShowSuggestions(false)

      // Preserve category filter if present
      const category = searchParams.get("category")
      const searchUrl = `/search?query=${encodeURIComponent(trimmedQuery)}${category ? `&category=${category}` : ""}`

      router.push(searchUrl)
    } catch (error) {
      console.error("Search navigation error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add this function for handling input changes:
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (value.length >= 2) {
      const newSuggestions = getSearchSuggestions(value)
      setSuggestions(newSuggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // Add this function for selecting suggestions:
  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Replace the form JSX with this enhanced version:
  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search articles..."
            className="pl-10 pr-16"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.length >= 2) setShowSuggestions(true)
            }}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
            disabled={isSubmitting || !query.trim()}
          >
            {isSubmitting ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Search suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <Search className="inline w-3 h-3 mr-2 text-gray-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {searchHistory.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-2">Recent searches</div>
              {searchHistory.slice(0, 5).map((historyItem, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  onClick={() => selectSuggestion(historyItem)}
                >
                  <Clock className="inline w-3 h-3 mr-2 text-gray-400" />
                  {historyItem}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
