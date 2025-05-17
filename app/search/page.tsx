import { AlgoliaSearch } from "@/components/AlgoliaSearch"
import { SearchFallback } from "@/components/SearchFallback"
import { Suspense } from "react"

export const metadata = {
  title: "Search - News on Africa",
  description: "Search for news articles across Africa",
}

export default function SearchPage() {
  // Check if Algolia is configured
  const isAlgoliaConfigured =
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
    process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME &&
    process.env.ALGOLIA_SEARCH_API_KEY

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Search</h1>

      <Suspense fallback={<div className="text-center p-8">Loading search...</div>}>
        {isAlgoliaConfigured ? <AlgoliaSearch /> : <SearchFallback />}
      </Suspense>
    </main>
  )
}
