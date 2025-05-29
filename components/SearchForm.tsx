"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Loader2 } from "lucide-react"

interface SearchFormProps {
  query: string
  onQueryChange: (query: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function SearchForm({
  query,
  onQueryChange,
  isLoading = false,
  placeholder = "Search articles...",
}: SearchFormProps) {
  const [localQuery, setLocalQuery] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync local query with prop
  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalQuery(value)
    onQueryChange(value)
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onQueryChange(localQuery)
  }

  // Clear search
  const handleClear = () => {
    setLocalQuery("")
    onQueryChange("")
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        {/* Search Input */}
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={localQuery}
          onChange={handleInputChange}
          className="pl-10 pr-20 h-12 text-base"
          autoComplete="off"
          autoFocus
        />

        {/* Right side buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Loading indicator */}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}

          {/* Clear button */}
          {localQuery && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}

          {/* Search button */}
          <Button type="submit" size="sm" disabled={isLoading || localQuery.trim().length < 2} className="h-8 px-3">
            Search
          </Button>
        </div>
      </div>

      {/* Search tips */}
      {!localQuery && (
        <p className="mt-2 text-sm text-gray-500">Start typing to search articles by title or content...</p>
      )}
    </form>
  )
}
