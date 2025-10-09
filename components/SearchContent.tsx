"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Configure,
  InstantSearch,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
  useStats,
} from "react-instantsearch-hooks-web"
import { formatDistanceToNow } from "date-fns"
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
import type { AlgoliaSearchRecord } from "@/lib/algolia/client"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { highlightSearchTerms } from "@/lib/search"
import { getArticleUrl } from "@/lib/utils/routing"

const PAN_AFRICAN_CODE = "all"
const VIRTUAL_INDEX_NAME = "newsonafrica-proxy-search"

const SUPPORTED_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((country) => country.code))

type SortOption = "relevance" | "latest"

type InstantSearchResponse<TRecord> = {
  hits: TRecord[]
  nbHits: number
  nbPages: number
  page: number
  hitsPerPage: number
  processingTimeMS: number
  query: string
  params: string
}

type InstantSearchClient<TRecord> = {
  search: (
    requests: Array<{
      indexName: string
      params?: Record<string, unknown>
    }>,
  ) => Promise<{ results: Array<InstantSearchResponse<TRecord>> }>
  searchForFacetValues?: (
    requests: Array<{
      indexName: string
      params: Record<string, unknown>
    }>,
  ) => Promise<{ results: Array<{ facetHits: Array<{ value: string; count: number }> }> }>
}

const createEmptyResponse = <TRecord,>(
  query: string,
  hitsPerPage: number,
): InstantSearchResponse<TRecord> => ({
  hits: [],
  nbHits: 0,
  nbPages: 0,
  page: 0,
  hitsPerPage,
  processingTimeMS: 0,
  query,
  params: `query=${encodeURIComponent(query)}`,
})

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

const createProxySearchClient = (
  options: { country: string; sort: SortOption },
): InstantSearchClient<AlgoliaSearchRecord> => {
  return {
    async search(requests) {
      const results = await Promise.all(
        requests.map(async (request) => {
          const params = request.params ?? {}
          const query = typeof params.query === "string" ? params.query : ""
          const trimmedQuery = query.trim()
          const hitsPerPage = Number.isFinite(Number(params.hitsPerPage))
            ? Number(params.hitsPerPage)
            : 12
          const requestedPage = Number.isFinite(Number(params.page)) ? Number(params.page) : 0

          if (!trimmedQuery) {
            return createEmptyResponse<AlgoliaSearchRecord>(query, hitsPerPage)
          }

          const searchParams = new URLSearchParams({
            q: trimmedQuery,
            page: String(requestedPage + 1),
            per_page: String(hitsPerPage),
            sort: options.sort,
          })

          if (options.country && options.country !== PAN_AFRICAN_CODE) {
            searchParams.set("country", options.country)
          } else {
            searchParams.set("country", PAN_AFRICAN_CODE)
          }

          try {
            const response = await fetch(`/api/search?${searchParams.toString()}`, {
              headers: { Accept: "application/json" },
              cache: "no-store",
            })

            if (!response.ok) {
              throw new Error(`Search request failed with status ${response.status}`)
            }

            const data = await response.json()
            const hits = (Array.isArray(data.results) ? data.results : []) as AlgoliaSearchRecord[]
            const total = Number.isFinite(Number(data.total)) ? Number(data.total) : hits.length
            const nbPages = Number.isFinite(Number(data.totalPages))
              ? Number(data.totalPages)
              : Math.max(1, Math.ceil(total / Math.max(hitsPerPage, 1)))
            const currentPage = Number.isFinite(Number(data.currentPage))
              ? Math.max(0, Number(data.currentPage) - 1)
              : Math.max(0, requestedPage)

            return {
              hits,
              nbHits: total,
              nbPages,
              page: currentPage,
              hitsPerPage,
              processingTimeMS: Number.isFinite(Number(data.performance?.responseTime))
                ? Number(data.performance.responseTime)
                : 0,
              query,
              params: `query=${encodeURIComponent(query)}`,
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.error("InstantSearch proxy search failed", error)
            }

            return createEmptyResponse<AlgoliaSearchRecord>(query, hitsPerPage)
          }
        }),
      )

      return { results }
    },
    async searchForFacetValues() {
      return { results: [] }
    },
  }
}

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

  useEffect(() => {
    const urlCountry = normalizeCountry(searchParams.get("country"))
    if (urlCountry !== country) {
      setCountry(urlCountry)
    }

    const urlSort = normalizeSort(searchParams.get("sort"))
    if (urlSort !== sort) {
      setSort(urlSort)
    }
  }, [searchParams, country, sort])

  const searchClient = useMemo(
    () => createProxySearchClient({ country, sort }),
    [country, sort],
  )

  const initialUiState = useMemo(
    () => ({
      [VIRTUAL_INDEX_NAME]: {
        query: initialQuery,
        page: Math.max(initialPage - 1, 0),
      },
    }),
    [initialPage, initialQuery],
  )

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={VIRTUAL_INDEX_NAME}
      initialUiState={initialUiState}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure hitsPerPage={12} />
      <SearchExperience
        router={router}
        country={country}
        sort={sort}
        onCountryChange={setCountry}
        onSortChange={setSort}
      />
    </InstantSearch>
  )
}

interface SearchExperienceProps {
  router: ReturnType<typeof useRouter>
  country: string
  sort: SortOption
  onCountryChange: (value: string) => void
  onSortChange: (value: SortOption) => void
}

function SearchExperience({ router, country, sort, onCountryChange, onSortChange }: SearchExperienceProps) {
  const searchParams = useSearchParams()
  const { indexUiState, setIndexUiState, refresh } = useInstantSearch()

  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams.toString())
    const urlQuery = urlParams.get("q") ?? ""
    const pageParam = Number.parseInt(urlParams.get("page") || "1", 10)
    const urlPage = Number.isNaN(pageParam) ? 0 : Math.max(pageParam - 1, 0)

    const updates: Partial<typeof indexUiState> = {}
    if ((indexUiState.query ?? "") !== urlQuery) {
      updates.query = urlQuery
    }
    if ((indexUiState.page ?? 0) !== urlPage) {
      updates.page = urlPage
    }

    if (Object.keys(updates).length > 0) {
      setIndexUiState({ ...indexUiState, ...updates })
    }
  }, [searchParams, indexUiState, setIndexUiState])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const query = (indexUiState.query ?? "").trim()
    const page = (indexUiState.page ?? 0) + 1

    if (query) {
      params.set("q", query)
    } else {
      params.delete("q")
    }

    if (page > 1) {
      params.set("page", String(page))
    } else {
      params.delete("page")
    }

    if (country && country !== PAN_AFRICAN_CODE) {
      params.set("country", country)
    } else {
      params.delete("country")
    }

    if (sort === "latest") {
      params.set("sort", "latest")
    } else {
      params.delete("sort")
    }

    const next = params.toString()
    if (next !== searchParams.toString()) {
      router.replace(next ? `/search?${next}` : "/search", { scroll: false })
    }
  }, [country, sort, indexUiState.page, indexUiState.query, router, searchParams])

  const handleCountryChange = useCallback(
    (value: string) => {
      const normalized = normalizeCountry(value)
      if (normalized === country) {
        return
      }
      onCountryChange(normalized)
      setIndexUiState({ ...indexUiState, page: 0 })
      refresh()
    },
    [country, indexUiState, onCountryChange, refresh, setIndexUiState],
  )

  const handleSortChange = useCallback(
    (value: SortOption) => {
      if (value === sort) {
        return
      }
      onSortChange(value)
      setIndexUiState({ ...indexUiState, page: 0 })
      refresh()
    },
    [indexUiState, onSortChange, refresh, setIndexUiState, sort],
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <InstantSearchBox country={country} sort={sort} placeholder="Search articles, categories, and tags..." />
        <SearchFilters
          country={country}
          sort={sort}
          onCountryChange={handleCountryChange}
          onSortChange={handleSortChange}
        />
      </div>

      <SearchResultsPanel fallbackCountry={country} />
    </div>
  )
}

interface InstantSearchBoxProps {
  placeholder?: string
  country: string
  sort: SortOption
}

function InstantSearchBox({ placeholder, country, sort }: InstantSearchBoxProps) {
  const { query, refine, clear, isSearchStalled } = useSearchBox()
  const [value, setValue] = useState(query ?? "")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)

  useEffect(() => {
    setValue(query ?? "")
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
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to fetch search suggestions", error)
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
        clear()
        return
      }

      refine(trimmed)
      setShowSuggestions(false)
    },
    [clear, refine, value],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setValue(suggestion)
      refine(suggestion)
      setShowSuggestions(false)
    },
    [refine],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setShowSuggestions(false)
      }
    },
    [],
  )

  const handleClear = useCallback(() => {
    setValue("")
    setSuggestions([])
    setShowSuggestions(false)
    clear()
  }, [clear])

  const isSearching = isSearchStalled || isFetchingSuggestions

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
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100"
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
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50"
              >
                {suggestion}
              </button>
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
  fallbackCountry: string
}

function SearchResultsPanel({ fallbackCountry }: SearchResultsPanelProps) {
  const { hits, isLastPage, showMore } = useInfiniteHits<AlgoliaSearchRecord>()
  const { indexUiState, results, status, error } = useInstantSearch()
  const { nbHits } = useStats()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const query = (indexUiState.query ?? "").trim()
  const totalHits = nbHits ?? results?.nbHits ?? hits.length
  const currentPage = (results?.page ?? 0) + 1
  const totalPages = results?.nbPages ?? 0

  if (!query) {
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
        <p>{error?.message || "Please try again in a few moments."}</p>
      </div>
    )
  }

  if (status === "loading" && hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Searching…</p>
      </div>
    )
  }

  if (hits.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <h3 className="mb-2 text-lg font-medium text-gray-900">No results found</h3>
        <p className="text-gray-500">We couldn't find any matches for "{query}". Try a different search term.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-500">
        Found {totalHits} {totalHits === 1 ? "result" : "results"} for "{query}"
      </div>

      <div className="mt-4 space-y-6">
        {hits.map((hit) => (
          <SearchResultHit
            key={hit.objectID}
            hit={hit}
            query={query}
            fallbackCountry={fallbackCountry}
            showHighlights={isClient}
          />
        ))}
      </div>

      {!isLastPage && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={showMore}
            variant="outline"
            className="min-w-[140px] bg-transparent"
            disabled={status === "loading" || status === "stalled"}
          >
            {status === "loading" || status === "stalled" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </>
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
  hit: AlgoliaSearchRecord
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
  const resolvedCountry = hit.country || parsed.country || (fallbackCountry !== PAN_AFRICAN_CODE ? fallbackCountry : undefined)
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
