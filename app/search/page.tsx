import { AlgoliaSearch } from "@/components/AlgoliaSearch"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search News on Africa",
  description: "Search for news articles across Africa",
}

export default function SearchPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Search News on Africa</h1>
      <AlgoliaSearch />
    </main>
  )
}
