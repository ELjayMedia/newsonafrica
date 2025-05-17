"use client"

import { useSearchParams } from "next/navigation"
import { SearchForm } from "@/components/SearchForm"
import { SearchResults } from "@/components/SearchResults"
import { Card, CardContent } from "@/components/ui/card"

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <SearchForm initialQuery={query} autoFocus />
        </CardContent>
      </Card>

      {query && <SearchResults />}
    </div>
  )
}
