import { GraphQLSearch } from "@/components/GraphQLSearch"
import { Suspense } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search News on Africa",
  description: "Search for news articles across Africa",
}

export default function SearchPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Search News on Africa</h1>
      <Suspense fallback={<div className="text-center p-8">Loading search...</div>}>
        <GraphQLSearch />
      </Suspense>
    </main>
  )
}
