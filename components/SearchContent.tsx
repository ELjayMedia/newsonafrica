"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SearchForm } from "./SearchForm"
import { SearchResults } from "./SearchResults"
import { Card, CardContent } from "@/components/ui/card"

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize component
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  if (!isInitialized) {
    return (
      <div className="space-y-6">
        <SearchForm initialQuery={query} autoFocus />
        <Card>
          <CardContent className="p-6 flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading search...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SearchForm initialQuery={query} autoFocus />
      {query ? (
        <SearchResults />
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Enter a search term to find articles across News on Africa.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
