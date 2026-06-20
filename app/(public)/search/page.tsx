import { Suspense } from "react"
import type { Metadata } from "next"

import { SearchContent } from "@/components/SearchContent"
import { SearchPageSkeleton } from "@/components/SearchPageSkeleton"

export const revalidate = 300

interface SearchPageProps {
  searchParams?: Promise<{ q?: string; page?: string; country?: string; sort?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {}
  const initialQuery = typeof params.q === "string" ? params.q : ""
  const initialPage = typeof params.page === "string" ? Math.max(1, Number.parseInt(params.page, 10) || 1) : 1
  const initialCountry = typeof params.country === "string" ? params.country : "all"
  const initialSort = params.sort === "latest" ? "latest" : "relevance"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Search News On Africa</h1>

        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchContent
            initialQuery={initialQuery}
            initialPage={initialPage}
            initialCountry={initialCountry}
            initialSort={initialSort}
          />
        </Suspense>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: "Search - News On Africa",
  description: "Search for news, articles, and stories from across Africa",
}
