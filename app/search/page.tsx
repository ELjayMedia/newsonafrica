import { Suspense } from "react"
import { SearchContent } from "@/components/SearchContent"
import { SearchAd } from "@/components/SearchAd"
import { SearchPageSkeleton } from "@/components/SearchPageSkeleton"

export const metadata = {
  title: "Search - News On Africa",
  description: "Search for articles on News On Africa",
}

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <SearchAd />
      <Suspense fallback={<SearchPageSkeleton />}>
        <SearchContent />
      </Suspense>
    </div>
  )
}
