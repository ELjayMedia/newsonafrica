"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon } from "lucide-react"

interface SearchFormProps {
  initialQuery?: string
  className?: string
  minimal?: boolean
}

export function SearchForm({ initialQuery = "", className = "", minimal = false }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update search term when URL changes
  useEffect(() => {
    const query = searchParams.get("query") || ""
    if (query !== searchTerm) {
      setSearchTerm(query)
    }
  }, [searchParams, searchTerm])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (searchTerm.trim()) {
      setIsSubmitting(true)

      // Preserve existing search parameters except 'page'
      const params = new URLSearchParams(searchParams.toString())
      params.set("query", searchTerm.trim())
      params.delete("page") // Reset to first page on new search

      router.push(`/search?${params.toString()}`)

      // Small delay to show loading state
      setTimeout(() => {
        setIsSubmitting(false)
      }, 300)
    }
  }

  return (
    <form
      onSubmit={handleSearch}
      className={`flex ${minimal ? "flex-row" : "flex-col sm:flex-row"} gap-2 ${className}`}
    >
      <div className="relative flex-grow">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search articles..."
          className="pr-10"
          disabled={isSubmitting}
        />
        {minimal && (
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-0 top-0 h-full"
            disabled={isSubmitting}
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!minimal && (
        <Button type="submit" variant="primary" className="min-w-[100px]" disabled={isSubmitting}>
          {isSubmitting ? "Searching..." : "Search"}
        </Button>
      )}
    </form>
  )
}
