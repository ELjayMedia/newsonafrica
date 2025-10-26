"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchFormProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  showSuggestions?: boolean
  autoFocus?: boolean
  size?: "sm" | "md" | "lg"
  country?: string
  sort?: "relevance" | "latest"
}

interface SearchSuggestion {
  text: string
  type: "recent" | "trending" | "suggestion"
}

export function SearchForm({
  placeholder = "Search articles, news, and stories...",
  className = "",
  onSearch,
  showSuggestions = true,
  autoFocus = false,
  size = "md",
  country = "all",
  sort = "relevance",
}: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("newsOnAfrica_recentSearches")
        if (saved) {
          setRecentSearches(JSON.parse(saved).slice(0, 5))
        }
      } catch (e) {
        console.error("Error loading recent searches:", e)
      }
    }
  }, [])

  // Save search to recent searches
  const saveToRecentSearches = useCallback(
    (searchQuery: string) => {
      if (typeof window === "undefined") return

      const trimmed = searchQuery.trim()
      if (!trimmed || trimmed.length < 2) return

      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem("newsOnAfrica_recentSearches", JSON.stringify(updated))
    },
    [recentSearches],
  )

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!showSuggestions || query.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, suggestions: "true" })
        if (country) {
          params.set("country", country)
        }
        params.set("sort", sort)

        const response = await fetch(`/api/search?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          const searchSuggestions: SearchSuggestion[] = [
            ...recentSearches
              .filter((search) => search.toLowerCase().includes(query.toLowerCase()))
              .map((text) => ({ text, type: "recent" as const })),
            ...(data.suggestions || []).map((text: string) => ({ text, type: "suggestion" as const })),
          ].slice(0, 8)

          setSuggestions(searchSuggestions)
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, showSuggestions, recentSearches, country, sort])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!query.trim()) return

      setIsLoading(true)
      setShowSuggestionsList(false)

      try {
        saveToRecentSearches(query.trim())

        if (onSearch) {
          onSearch(query.trim())
        } else {
          const params = new URLSearchParams({ q: query.trim() })
          if (country) {
            params.set("country", country)
          }
          params.set("sort", sort)
          router.push(`/search?${params.toString()}`)
        }
      } catch (error) {
        console.error("Search form error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [query, onSearch, router, saveToRecentSearches, country, sort],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedSuggestion(-1)
    setShowSuggestionsList(value.length > 0 && showSuggestions)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    setShowSuggestionsList(false)
    saveToRecentSearches(suggestion.text)

    if (onSearch) {
      onSearch(suggestion.text)
    } else {
      const params = new URLSearchParams({ q: suggestion.text })
      if (country) {
        params.set("country", country)
      }
      params.set("sort", sort)
      router.push(`/search?${params.toString()}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsList || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        if (selectedSuggestion >= 0) {
          e.preventDefault()
          handleSuggestionClick(suggestions[selectedSuggestion])
        }
        break
      case "Escape":
        setShowSuggestionsList(false)
        setSelectedSuggestion(-1)
        inputRef.current?.blur()
        break
    }
  }

  const clearSearch = () => {
    setQuery("")
    setShowSuggestionsList(false)
    setSelectedSuggestion(-1)
    inputRef.current?.focus()
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("newsOnAfrica_recentSearches")
    }
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      input: "h-9 text-sm",
      button: "h-7 px-2 text-xs",
      icon: "h-3 w-3",
    },
    md: {
      input: "h-11 text-base",
      button: "h-8 px-3 text-sm",
      icon: "h-4 w-4",
    },
    lg: {
      input: "h-14 text-lg",
      button: "h-10 px-4",
      icon: "h-5 w-5",
    },
  }

  const config = sizeConfig[size]

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${config.icon}`} />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestionsList(query.length > 0 && showSuggestions)}
            onBlur={() => {
              // Delay hiding to allow suggestion clicks
              setTimeout(() => setShowSuggestionsList(false), 150)
            }}
            placeholder={placeholder}
            className={`pl-10 pr-24 ${config.input} transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            disabled={isLoading}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck="false"
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className={`${config.icon} animate-spin text-gray-400`} />}

            {query && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className={`${config.button} hover:bg-gray-100 p-1`}
                tabIndex={-1}
              >
                <X className={config.icon} />
                <span className="sr-only">Clear search</span>
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !query.trim()}
              className={`${config.button} bg-blue-600 hover:bg-blue-700 text-white`}
            >
              {isLoading ? <Loader2 className={`${config.icon} animate-spin`} /> : "Search"}
            </Button>
          </div>
        </div>
      </form>

      {/* Enhanced suggestions dropdown */}
      {showSuggestionsList && (suggestions.length > 0 || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 ${
                    index === selectedSuggestion ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  {suggestion.type === "recent" ? (
                    <Clock className="h-3 w-3 text-gray-400" />
                  ) : (
                    <Search className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="flex-1">{suggestion.text}</span>
                  {suggestion.type === "recent" && <span className="text-xs text-gray-400">Recent</span>}
                </button>
              ))}

              {recentSearches.length > 0 && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="w-full text-left px-4 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear recent searches
                  </button>
                </div>
              )}
            </div>
          ) : (
            query.length === 0 &&
            recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Recent Searches
                </div>
                {recentSearches.map((search, _index) => (
                  <button
                    key={search}
                    type="button"
                    onClick={() => handleSuggestionClick({ text: search, type: "recent" })}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>{search}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="w-full text-left px-4 py-1 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-100 mt-2"
                >
                  Clear recent searches
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Search tips for empty state */}
      {!query && !showSuggestionsList && (
        <div className="mt-2 text-xs text-gray-500">
          Try searching for topics like "politics", "business", "sports", or specific countries
        </div>
      )}
    </div>
  )
}
