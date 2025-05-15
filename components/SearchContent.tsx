"use client"

import { useSearchParams } from "next/navigation"
import { SearchResults } from "@/components/SearchResults"
import { SearchForm } from "@/components/SearchForm"
import { Card, CardContent } from "@/components/ui/card"

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <SearchForm initialQuery={query} />
        </CardContent>
      </Card>

      <SearchResults />
    </div>
  )
}
