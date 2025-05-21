import type { Metadata } from "next"
import { SearchContent } from "@/components/SearchContent"

export const metadata: Metadata = {
  title: "Search - News on Africa",
  description: "Search for articles on News on Africa",
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: { query?: string }
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>
      <SearchContent />
    </div>
  )
}
