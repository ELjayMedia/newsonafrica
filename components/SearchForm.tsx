"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    try {
      setIsSubmitting(true)
      const trimmedQuery = query.trim()

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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search articles..."
          className="pl-10 pr-16"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  )
}
