import type { Metadata } from "next"
import { SearchContent } from "@/components/SearchContent"

interface SearchPageProps {
  searchParams: {
    query?: string
    sort?: string
    page?: string
    categories?: string
    tags?: string
    dateFrom?: string
    dateTo?: string
  }
}

// Generate metadata for SEO
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.query || ""

  return {
    title: query ? `Search results for "${query}" | News On Africa` : "Search | News On Africa",
    description: query
      ? `Find the latest news and articles about "${query}" on News On Africa`
      : "Search for news, articles, and topics across Africa",
    robots: {
      index: false,
      follow: true,
    },
  }
}

export default function SearchPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <SearchContent />
    </main>
  )
}
