import { Suspense } from "react"
import { SearchContent } from "@/components/SearchContent"
import { SearchPageSkeleton } from "@/components/SearchPageSkeleton"
import { SearchDebugger } from "@/components/SearchDebugger"

interface SearchPageProps {
  searchParams: { q?: string; page?: string }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ""
  const page = Number.parseInt(searchParams.page || "1", 10)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Search News On Africa</h1>

        {/* Temporary debugger - remove after fixing */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-8">
            <SearchDebugger />
          </div>
        )}

        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchContent initialQuery={query} />
        </Suspense>
      </div>
    </div>
  )
}

export const metadata = {
  title: "Search - News On Africa",
  description: "Search for news, articles, and stories from across Africa",
}
