import { Suspense } from "react"
import { SearchContent } from "@/components/SearchContent"
import { SearchPageSkeleton } from "@/components/SearchPageSkeleton"
import { SearchDebugger } from "@/components/SearchDebugger"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"

const PAN_AFRICAN_CODE = "all"
const SUPPORTED_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((country) => country.code))

const normalizeCountryParam = (value?: string | null): string => {
  if (!value) {
    return PAN_AFRICAN_CODE
  }

  const normalized = value.trim().toLowerCase()

  if (
    normalized === PAN_AFRICAN_CODE ||
    normalized === "pan" ||
    normalized === "africa" ||
    normalized === "pan-africa" ||
    normalized === "african"
  ) {
    return PAN_AFRICAN_CODE
  }

  if (SUPPORTED_COUNTRY_CODES.has(normalized)) {
    return normalized
  }

  return PAN_AFRICAN_CODE
}

const normalizeSortParam = (value?: string | null): "relevance" | "latest" =>
  value === "latest" ? "latest" : "relevance"

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; country?: string; sort?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams
  const query = resolvedParams.q || ""
  const parsedPage = Number.parseInt(resolvedParams.page || "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const country = normalizeCountryParam(resolvedParams.country)
  const sort = normalizeSortParam(resolvedParams.sort)

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
          <SearchContent
            initialQuery={query}
            initialPage={page}
            initialCountry={country}
            initialSort={sort}
          />
        </Suspense>
      </div>
    </div>
  )
}

export const metadata = {
  title: "Search - News On Africa",
  description: "Search for news, articles, and stories from across Africa",
}
