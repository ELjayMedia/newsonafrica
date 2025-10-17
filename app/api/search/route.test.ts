import { beforeEach, describe, expect, it, vi } from "vitest"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import type { SearchResponse } from "@/lib/wordpress-search"

vi.mock("@/lib/algolia/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/algolia/client")>()
  return {
    ...actual,
    resolveSearchIndex: vi.fn(),
  }
})

vi.mock("@/lib/wordpress-search", () => ({
  searchWordPressPosts: vi.fn(),
  getSearchSuggestions: vi.fn(),
}))

const { GET } = await import("./route")
const { resolveSearchIndex } = await import("@/lib/algolia/client")
const { searchWordPressPosts, getSearchSuggestions } = await import("@/lib/wordpress-search")

const mockResolveSearchIndex = vi.mocked(resolveSearchIndex)
const mockSearchWordPressPosts = vi.mocked(searchWordPressPosts)
const mockGetSearchSuggestions = vi.mocked(getSearchSuggestions)

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveSearchIndex.mockReturnValue(null)
  })

  it("fans out WordPress fallback searches for the pan-African scope", async () => {
    const query = "climate"
    const postsPerCountry = 2
    const perPage = SUPPORTED_COUNTRIES.length * postsPerCountry
    const countryCodes = SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase())
    const expectedFetchSize = Math.min(100, perPage)

    const buildResponse = (country: string, dates: string[], titles: string[]): SearchResponse => ({
      results: dates.map((date, index) => ({
        id: index + 1,
        slug: `${country}-post-${index + 1}`,
        title: { rendered: titles[index] },
        excerpt: { rendered: `${titles[index]} excerpt` },
        content: { rendered: `${titles[index]} content` },
        date,
        link: `https://example.com/${country}/${index + 1}`,
        featured_media: 0,
        categories: [],
        tags: [],
        author: 1,
      })),
      total: dates.length,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
      query,
      searchTime: 15,
    })

    const responsesByCountry: Record<string, SearchResponse> = {}
    const firstCountryCode = countryCodes[0]
    const secondCountryCode = countryCodes[1]

    countryCodes.forEach((code, index) => {
      const baseDate = new Date(Date.UTC(2024, 5, 1 + index * postsPerCountry))
      const dates = Array.from({ length: postsPerCountry }, (_, offset) =>
        new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000).toISOString(),
      )
      const titles = Array.from({ length: postsPerCountry }, (_, offset) =>
        `${code.toUpperCase()} Headline ${offset + 1}`,
      )
      responsesByCountry[code] = buildResponse(code, dates, titles)
    })

    mockSearchWordPressPosts.mockImplementation(async (_query, options = {}) => {
      const country = options.country?.toLowerCase()
      const response = country ? responsesByCountry[country] : undefined
      if (!response) {
        throw new Error(`Unexpected country: ${country}`)
      }
      expect(options.page).toBe(1)
      expect(options.perPage).toBe(expectedFetchSize)
      return response
    })

    const requestUrl = `https://example.com/api/search?q=${query}&scope=pan&per_page=${perPage}&page=1`
    const response = await GET(new Request(requestUrl))
    const payload = await response.json()

    expect(mockSearchWordPressPosts).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    countryCodes.forEach((code) => {
      expect(mockSearchWordPressPosts).toHaveBeenCalledWith(query, expect.objectContaining({ country: code }))
    })

    expect(payload.results).toHaveLength(perPage)
    expect(new Set(payload.results.map((record: { country: string }) => record.country)).size).toBe(
      SUPPORTED_COUNTRIES.length,
    )
    expect(payload.total).toBe(perPage)
    expect(payload.performance.source).toBe("wordpress")
    const suggestions = new Set(payload.suggestions)
    if (firstCountryCode) {
      expect(suggestions.has(`${firstCountryCode.toUpperCase()} Headline 1`)).toBe(true)
    }
    if (secondCountryCode) {
      expect(suggestions.has(`${secondCountryCode.toUpperCase()} Headline 1`)).toBe(true)
    }
  })

  it("normalizes the query when using the WordPress suggestions fallback for the pan-African scope", async () => {
    const rawQuery = "  Climate   Change  "
    const normalizedQuery = "Climate Change"

    mockSearchWordPressPosts.mockImplementation(async (receivedQuery, options = {}) => {
      expect(receivedQuery).toBe(normalizedQuery)
      const country = options.country || "unknown"
      return {
        results: [
          {
            id: 1,
            slug: `${country}-post`,
            title: { rendered: `${country.toUpperCase()} Headline` },
            excerpt: { rendered: `${country.toUpperCase()} summary` },
            content: { rendered: `${country.toUpperCase()} content` },
            date: new Date().toISOString(),
            link: `https://example.com/${country}`,
            featured_media: 0,
            categories: [],
            tags: [],
            author: 1,
          },
        ],
        total: 1,
        totalPages: 1,
        currentPage: 1,
        hasMore: false,
        query: receivedQuery,
        searchTime: 5,
      }
    })

    const requestUrl = `https://example.com/api/search?q=${encodeURIComponent(rawQuery)}&scope=pan&suggestions=1`
    const response = await GET(new Request(requestUrl))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockSearchWordPressPosts).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    mockSearchWordPressPosts.mock.calls.forEach(([receivedQuery]) => {
      expect(receivedQuery).toBe(normalizedQuery)
    })
    expect(mockGetSearchSuggestions).not.toHaveBeenCalled()
    expect(Array.isArray(payload.suggestions)).toBe(true)
  })

  it("normalizes the query when fetching WordPress search suggestions for a specific country", async () => {
    const rawQuery = "  Elections   Update  "
    const normalizedQuery = "Elections Update"
    const suggestions = ["Elections Update 2024", "Elections Update Live"]

    mockGetSearchSuggestions.mockResolvedValue(suggestions)

    const requestUrl = `https://example.com/api/search?query=${encodeURIComponent(rawQuery)}&scope=za&suggestions=1`
    const response = await GET(new Request(requestUrl))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetSearchSuggestions).toHaveBeenCalledWith(normalizedQuery, 10, "za")
    expect(payload.suggestions).toEqual(suggestions)
    expect(mockSearchWordPressPosts).not.toHaveBeenCalled()
  })
})
