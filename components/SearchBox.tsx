"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBoxProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  initialValue?: string
  showSuggestions?: boolean
  autoFocus?: boolean
  size?: "default" | "compact"
}

export function SearchBox({
  placeholder = "Search articles, news, and more...",
  className = "",
  onSearch,
  initialValue = "",
  showSuggestions = true,
  autoFocus = false,
  size = "default",
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!showSuggestions || query.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&suggestions=true`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, showSuggestions])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!query.trim()) return

      setIsLoading(true)
      setShowSuggestionsList(false)

      try {
        if (onSearch) {
          onSearch(query.trim())
        } else {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [query, onSearch, router],
  )

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestionsList(false)

    if (onSearch) {
      onSearch(suggestion)
    } else {
      router.push(`/search?q=${encodeURIComponent(suggestion)}`)
    }
  }

  const isCompact = size === "compact"

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestionsList(e.target.value.length > 0 && showSuggestions)
            }}
            onFocus={() => setShowSuggestionsList(query.length > 0 && showSuggestions)}
            onBlur={() => {
              // Delay hiding to allow suggestion clicks
              setTimeout(() => setShowSuggestionsList(false), 150)
            }}
            placeholder={placeholder}
            className={`
              ${isCompact ? "pl-9 h-8 text-sm bg-gray-100 border-none rounded-full" : "pl-10 pr-24 h-12"}
              transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            `}
            disabled={isLoading}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck="false"
          />

          {!isCompact && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}

              {query && !isLoading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("")
                    inputRef.current?.focus()
                  }}
                  className="hover:bg-gray-100 p-1"
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !query.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
          <div className="py-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
