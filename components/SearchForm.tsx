"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchFormProps {
  initialQuery?: string
  className?: string
  minimal?: boolean
  onSearch?: (query: string) => void
  autoFocus?: boolean
}

export function SearchForm({
  initialQuery = "",
  className = "",
  minimal = false,
  onSearch,
  autoFocus = false,
}: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update query when URL changes
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

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setIsSubmitting(true)

    // Call onSearch callback if provided
    if (onSearch) {
      onSearch(trimmedQuery)
    } else {
      // Otherwise navigate to search page
      const params = new URLSearchParams(searchParams.toString())
      params.set("query", trimmedQuery)
      params.delete("page") // Reset pagination

      router.push(`/search?${params.toString()}`)
    }

    // Reset submitting state after a short delay
    setTimeout(() => {
      setIsSubmitting(false)
    }, 300)
  }

  // Clear search input
  const handleClear = () => {
    setQuery("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex ${minimal ? "flex-row" : "flex-col sm:flex-row"} gap-2 ${className}`}
      role="search"
    >
      <div className="relative flex-grow">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className={`pr-${query ? "10" : "4"}`}
          disabled={isSubmitting}
          aria-label="Search query"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-0 h-full px-2 flex items-center justify-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {minimal && (
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-0 top-0 h-full"
            disabled={isSubmitting}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!minimal && (
        <Button type="submit" className="min-w-[100px]" disabled={isSubmitting || !query.trim()}>
          {isSubmitting ? "Searching..." : "Search"}
        </Button>
      )}
    </form>
  )
}
