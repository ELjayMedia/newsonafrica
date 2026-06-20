import { Suspense } from "react"

import { SearchContent } from "@/components/SearchContent"
import { SearchPageSkeleton } from "@/components/SearchPageSkeleton"

export const revalidate = 300

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Search News On Africa</h1>

        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchContent />
        </Suspense>
      </div>
    </div>
  )
}

export const metadata = {
  title: "Search - News On Africa",
  description: "Search for news, articles, and stories from across Africa",
}
