"use client"

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"
import { Loader2, Search as SearchIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { highlightSearchTerms } from "@/lib/search"
import { getArticleUrl } from "@/lib/utils/routing"
import type { SearchRecord } from "@/types/search"

const PAN_AFRICAN_CODE = "all"
const RESULTS_PER_PAGE = 12

const SUPPORTED_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((country) => country.code))

type SortOption = "relevance" | "latest"
type SearchStatus = "idle" | "loading" | "loadingMore" | "error" | "success"

const normalizeCountry = (value?: string | null): string => {
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

const normalizeSort = (value?: string | null): SortOption => (value === "latest" ? "latest" : "relevance")

interface SearchContentProps {
  initialQuery?: string
  initialPage?: number
  initialCountry?: string
  initialSort?: SortOption
}

export function SearchContent({
  initialQuery = "",
  initialPage = 1,
  initialCountry = PAN_AFRICAN_CODE,
  initialSort = "relevance",
}: SearchContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [country, setCountry] = useState(() => normalizeCountry(initialCountry))
  const [sort, setSort] = useState<SortOption>(() => normalizeSort(initialSort))
  const [searchQuery, setSearchQuery] = useState(initialQuery.trim())
  const [requestedPage, setRequestedPage] = useState(Math.max(initialPage, 1))
  const [currentPage, setCurrentPage] = useState(Math.max(initialPage, 1))
  const [results, setResults] = useState<SearchRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<SearchStatus>(() => (initialQuery.trim() ? "loading" : "idle"))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    const urlCountry = normalizeCountry(params.get("country"))
    if (urlCountry !== country) {
      setCountry(urlCountry)
    }

    const urlSort = normalizeSort(params.get("sort"))
    if (urlSort !== sort) {
      setSort(urlSort)
    }

    const urlQuery = (params.get("q") ?? "").trim()
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery)
    }

    const parsedPage = Number.parseInt(params.get("page") ?? "", 10)
    const urlPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1)
    if (urlPage !== requestedPage) {
      setRequestedPage(urlPage)
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage)
    }
  }, [searchParams, country, sort, searchQuery, requestedPage, currentPage])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      if (requestedPage !== 1) {
        setRequestedPage(1)
      }
      if (currentPage !== 1) {
        setCurrentPage(1)
      }
      setResults([])
      setTotal(0)
      setTotalPages(0)
      setHasMore(false)
      setError(null)
      setStatus("idle")
      return
    }

    const controller = new AbortController()
    let cancelled = false

    const fetchResults = async () => {
      setError(null)
      setStatus(requestedPage === 1 ? "loading" : "loadingMore")
      if (requestedPage === 1) {
        setResults([])
        setCurrentPage(1)
      }

      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          page: String(requestedPage),
          per_page: String(RESULTS_PER_PAGE),
          sort,
        })

        if (country && country !== PAN_AFRICAN_CODE) {
          params.set("country", country)
        } else {
          params.set("country", PAN_AFRICAN_CODE)
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Search request failed with status ${response.status}`)
        }

        const data = await response.json()
        if (cancelled) {
          return
        }

        const hits = (Array.isArray(data.results) ? data.results : []) as SearchRecord[]
        const resolvedTotal = Number.isFinite(Number(data.total)) ? Number(data.total) : hits.length
        const resolvedPage = Number.isFinite(Number(data.currentPage))
          ? Math.max(1, Number(data.currentPage))
          : requestedPage
        const resolvedTotalPages = Number.isFinite(Number(data.totalPages))
          ? Math.max(1, Number(data.totalPages))
          : Math.max(1, Math.ceil(resolvedTotal / RESULTS_PER_PAGE))

        setResults((previous) => (requestedPage === 1 ? hits : [...previous, ...hits]))
        setTotal(resolvedTotal)
        setTotalPages(resolvedTotalPages)
        setCurrentPage(resolvedPage)
        setHasMore(
          typeof data.hasMore === "boolean"
            ? data.hasMore
            : resolvedPage < resolvedTotalPages,
        )
        setStatus("success")
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return
        }

        if (process.env.NODE_ENV !== "production") {
          console.error("Search request failed", caughtError)
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to fetch search results",
        )
        setStatus("error")

        if (requestedPage > 1) {
          setRequestedPage((previous) => Math.max(1, previous - 1))
        } else {
          setResults([])
          setTotal(0)
          setTotalPages(0)
          setHasMore(false)
        }
      }
    }

    fetchResults()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [searchQuery, country, sort, requestedPage, currentPage])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    const params = new URLSearchParams()

    if (trimmedQuery) {
      params.set("q", trimmedQuery)
    }

    if (currentPage > 1) {
      params.set("page", String(currentPage))
    }

    if (country && country !== PAN_AFRICAN_CODE) {
      params.set("country", country)
    }

    if (sort === "latest") {
      params.set("sort", "latest")
    }

    const next = params.toString()
    if (next !== searchParams.toString()) {
      router.replace(next ? `/search?${next}` : "/search", { scroll: false })
    }
  }, [router, searchParams, searchQuery, currentPage, country, sort])

  const handleSearch = useCallback((value: string) => {
    const trimmed = value.trim()
    setRequestedPage(1)
    setCurrentPage(1)
    setSearchQuery(trimmed)
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setSearchQuery("")
    setRequestedPage(1)
    setCurrentPage(1)
    setResults([])
    setTotal(0)
    setTotalPages(0)
    setHasMore(false)
    setStatus("idle")
    setError(null)
  }, [])

  const handleCountryChange = useCallback(
    (value: string) => {
      const normalized = normalizeCountry(value)
      if (normalized === country) {
        return
      }

      setCountry(normalized)
      setRequestedPage(1)
      setCurrentPage(1)
      setError(null)
    },
    [country],
  )

  const handleSortChange = useCallback(
    (value: SortOption) => {
      if (value === sort) {
        return
      }

      setSort(value)
      setRequestedPage(1)
      setCurrentPage(1)
      setError(null)
    },
    [sort],
  )

  const handleLoadMore = useCallback(() => {
    if (!hasMore || status === "loadingMore") {
      return
    }

    setRequestedPage((previous) => previous + 1)
  }, [hasMore, status])

  const isSearching = status === "loading" || status === "loadingMore"

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <SearchBox
          query={searchQuery}
          country={country}
          sort={sort}
          placeholder="Search articles, categories, and tags..."
          onSearch={handleSearch}
          onClear={handleClear}
          isSearching={isSearching}
        />
        <SearchFilters
          country={country}
          sort={sort}
          onCountryChange={handleCountryChange}
          onSortChange={handleSortChange}
        />
      </div>

      <SearchResultsPanel
        query={searchQuery}
        results={results}
        status={status}
        error={error}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        fallbackCountry={country}
      />
    </div>
  )
}

interface SearchBoxProps {
  placeholder?: string
  country: string
  sort: SortOption
  query: string
  onSearch: (value: string) => void
  onClear: () => void
  isSearching: boolean
}

function SearchBox({ placeholder, country, sort, query, onSearch, onClear, isSearching }: SearchBoxProps) {
  const [value, setValue] = useState(query)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)

  useEffect(() => {
    setValue(query)
  }, [query])

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setIsFetchingSuggestions(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true)
        const params = new URLSearchParams({ q: trimmed, suggestions: "true", sort })
        if (country && country !== PAN_AFRICAN_CODE) {
          params.set("country", country)
        } else {
          params.set("country", PAN_AFRICAN_CODE)
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Suggestion request failed with status ${response.status}`)
        }

        const data = await response.json()
        if (!cancelled) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 10) : [])
        }
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to fetch search suggestions", caughtError)
        }
      } finally {
        if (!cancelled) {
          setIsFetchingSuggestions(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value, country, sort])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = value.trim()
      if (!trimmed) {
        onClear()
        return
      }

      onSearch(trimmed)
      setShowSuggestions(false)
    },
    [onClear, onSearch, value],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setValue(suggestion)
      onSearch(suggestion)
      setShowSuggestions(false)
    },
    [onSearch],
  )

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShowSuggestions(false)
    }
  }, [])

  const handleClear = useCallback(() => {
    setValue("")
    setSuggestions([])
    setShowSuggestions(false)
    onClear()
  }, [onClear])

  const busy = isSearching || isFetchingSuggestions

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => {
            if (value.trim().length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-12 pl-10 pr-24"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {busy && (
            <div className="flex items-center gap-1 text-xs text-gray-500" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span>Loading</span>
            </div>
          )}

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="rounded-md p-1"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}

          <Button type="submit" size="sm" disabled={!value.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
            Search
          </Button>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="py-2 text-sm">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start rounded-md px-4 py-2 font-normal"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}

interface SearchFiltersProps {
  country: string
  sort: SortOption
  onCountryChange: (value: string) => void
  onSortChange: (value: SortOption) => void
}

function SearchFilters({ country, sort, onCountryChange, onSortChange }: SearchFiltersProps) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Edition</span>
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pan-African (All)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PAN_AFRICAN_CODE}>Pan-African (All)</SelectItem>
            {SUPPORTED_COUNTRIES.map((entry) => (
              <SelectItem key={entry.code} value={entry.code}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Sort by</span>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="latest">Latest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface SearchResultsPanelProps {
  query: string
  results: SearchRecord[]
  status: SearchStatus
  error: string | null
  total: number
  currentPage: number
  totalPages: number
  hasMore: boolean
  onLoadMore: () => void
  fallbackCountry: string
}

function SearchResultsPanel({
  query,
  results,
  status,
  error,
  total,
  currentPage,
  totalPages,
  hasMore,
  onLoadMore,
  fallbackCountry,
}: SearchResultsPanelProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const trimmedQuery = query.trim()
  const totalHits = total > 0 ? total : results.length

  if (!trimmedQuery) {
    return (
      <div className="py-12 text-center text-gray-600">
        <div className="mb-2 text-lg">Start searching</div>
        <p>Enter a search term above to find articles, categories, and tags.</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <h3 className="mb-2 font-semibold">We couldn't complete your search.</h3>
        <p>{error || "Please try again in a few moments."}</p>
      </div>
    )
  }

  if (status === "loading" && results.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border bg-white py-12"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 text-gray-400" aria-hidden="true" />
        <p className="mt-4 text-gray-500">Searching…</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <h3 className="mb-2 text-lg font-medium text-gray-900">No results found</h3>
        <p className="text-gray-500">We couldn't find any matches for "{trimmedQuery}". Try a different search term.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-500">
        Found {totalHits} {totalHits === 1 ? "result" : "results"} for "{trimmedQuery}"
      </div>

      <div className="mt-4 space-y-6">
        {results.map((hit) => (
          <SearchResultHit
            key={hit.objectID}
            hit={hit}
            query={trimmedQuery}
            fallbackCountry={fallbackCountry}
            showHighlights={isClient}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="min-w-[140px] bg-transparent"
            disabled={status === "loadingMore"}
          >
            {status === "loadingMore" ? (
              <span className="flex items-center" role="status" aria-live="polite">
                <Loader2 className="mr-2 h-4 w-4 text-blue-600" aria-hidden="true" />
                Loading…
              </span>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pt-4 text-center text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </div>
  )
}

interface SearchResultHitProps {
  hit: SearchRecord
  query: string
  fallbackCountry: string
  showHighlights: boolean
}

const extractSlug = (objectID: string): { country?: string; slug: string } => {
  if (!objectID) {
    return { slug: objectID }
  }

  const [country, ...rest] = objectID.split(":")
  if (rest.length === 0) {
    return { slug: objectID }
  }

  return {
    country,
    slug: rest.join(":"),
  }
}

function SearchResultHit({ hit, query, fallbackCountry, showHighlights }: SearchResultHitProps) {
  const parsed = extractSlug(hit.objectID)
  const resolvedCountry =
    hit.country ||
    parsed.country ||
    (fallbackCountry !== PAN_AFRICAN_CODE ? fallbackCountry : undefined)
  const slug = parsed.slug || hit.objectID
  const href = getArticleUrl(slug, resolvedCountry)

  const publishedLabel = hit.published_at
    ? formatDistanceToNow(new Date(hit.published_at), { addSuffix: true })
    : undefined

  const highlightedTitle = highlightSearchTerms(hit.title || "Untitled article", query)
  const excerpt = hit.excerpt || ""
  const trimmedExcerpt = excerpt.length > 220 ? `${excerpt.slice(0, 220)}…` : excerpt
  const highlightedExcerpt = highlightSearchTerms(trimmedExcerpt, query)
  const categories = Array.isArray(hit.categories) ? hit.categories : []

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <Link href={href} className="group block">
        <h3 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
          {showHighlights ? (
            <span dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
          ) : (
            hit.title || "Untitled article"
          )}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>{publishedLabel || "Unknown date"}</span>
          {resolvedCountry && <span className="uppercase">• {resolvedCountry}</span>}
          {categories.length > 0 && (
            <span className="truncate">
              • {categories.slice(0, 3).join(", ")}
              {categories.length > 3 ? "…" : ""}
            </span>
          )}
        </div>
        <p className="mt-2 text-gray-600">
          {showHighlights ? (
            <span dangerouslySetInnerHTML={{ __html: highlightedExcerpt }} />
          ) : (
            trimmedExcerpt
          )}
        </p>
      </Link>
    </div>
  )
}
