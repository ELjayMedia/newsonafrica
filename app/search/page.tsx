import { SearchResults } from "@/components/SearchResults"
import { Suspense } from "react"

export const metadata = {
  title: "Search - News on Africa",
  description: "Search for news articles across Africa",
}

export default function SearchPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Search</h1>

      <Suspense fallback={<div className="text-center p-8">Loading search...</div>}>
        <SearchResults />
      </Suspense>
    </main>
  )
}
