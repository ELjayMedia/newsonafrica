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
    const postsPerCountry = 6
    const perPage = 4
    const page = 2
    const countryCodes = SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase())
    const desiredTotal = page * perPage
    const basePerCountry = Math.ceil(desiredTotal / SUPPORTED_COUNTRIES.length)
    const expectedFetchSize = Math.min(
      100,
      Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1))),
    )

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
    const allTitles: string[] = []
    const startDate = Date.UTC(2024, 5, 1)
    let globalDayOffset = 0

    countryCodes.forEach((code) => {
      const dates = Array.from({ length: postsPerCountry }, () => {
        const date = new Date(startDate + globalDayOffset * 24 * 60 * 60 * 1000).toISOString()
        globalDayOffset += 1
        return date
      })
      const titles = Array.from({ length: postsPerCountry }, (_, offset) =>
        `${code.toUpperCase()} Headline ${offset + 1}`,
      )
      responsesByCountry[code] = buildResponse(code, dates, titles)
      allTitles.push(...titles)
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

    const requestUrl = `https://example.com/api/search?q=${query}&scope=pan&per_page=${perPage}&page=${page}`
    const response = await GET(new Request(requestUrl))
    const payload = await response.json()

    expect(mockSearchWordPressPosts).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    countryCodes.forEach((code) => {
      expect(mockSearchWordPressPosts).toHaveBeenCalledWith(query, expect.objectContaining({ country: code }))
    })

    expect(payload.results).toHaveLength(perPage)

    const allRecords = countryCodes.flatMap((code) =>
      responsesByCountry[code].results.map((post) => ({
        objectID: `${code}:${post.slug}`,
        publishedAt: new Date(post.date).getTime(),
      })),
    )

    const expectedObjectIDs = allRecords
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice((page - 1) * perPage, page * perPage)
      .map((entry) => entry.objectID)

    const actualObjectIDs = payload.results.map((record: { objectID: string }) => record.objectID)
    expect(actualObjectIDs).toEqual(expectedObjectIDs)

    payload.results.reduce((previousDate: number, record: { published_at: string }) => {
      const currentDate = new Date(record.published_at).getTime()
      expect(currentDate).toBeLessThanOrEqual(previousDate)
      return currentDate
    }, Number.POSITIVE_INFINITY)

    const total = countryCodes.reduce(
      (sum, code) => sum + (responsesByCountry[code]?.total ?? 0),
      0,
    )

    expect(payload.total).toBe(total)
    expect(payload.totalPages).toBe(Math.max(1, Math.ceil(total / perPage)))
    expect(payload.currentPage).toBe(page)
    expect(payload.hasMore).toBe(page < payload.totalPages)
    expect(payload.performance.source).toBe("wordpress")
    expect(payload.suggestions.length).toBeLessThanOrEqual(10)
    payload.suggestions.forEach((title: string) => {
      expect(allTitles).toContain(title)
    })
  })

  it("limits per-country fetch size while incrementally fetching additional pages", async () => {
    const query = "economy"
    const perPage = 100
    const page = 5
    const countryCodes = SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase())
    const desiredTotal = page * perPage
    const basePerCountry = Math.ceil(desiredTotal / countryCodes.length)
    const expectedPerCountry = Math.min(
      100,
      Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1))),
    )

    const totalPostsPerCountry = 320
    const postsByCountry: Record<string, Array<{ date: string; title: string; slug: string }>> = {}
    const callHistory: Record<string, number[]> = {}
    const startDate = Date.UTC(2024, 0, 1)

    countryCodes.forEach((code, countryIndex) => {
      postsByCountry[code] = Array.from({ length: totalPostsPerCountry }, (_, index) => {
        const date = new Date(startDate - (countryIndex * totalPostsPerCountry + index) * 24 * 60 * 60 * 1000)
        return {
          date: date.toISOString(),
          title: `${code.toUpperCase()} Economic Update ${index + 1}`,
          slug: `${code}-economy-${index + 1}`,
        }
      })
      callHistory[code] = []
    })

    mockSearchWordPressPosts.mockImplementation(async (receivedQuery, options = {}) => {
      expect(receivedQuery).toBe(query)
      const country = options.country?.toLowerCase()
      expect(country).toBeDefined()

      if (!country || !postsByCountry[country]) {
        throw new Error(`Unexpected country: ${country}`)
      }

      const requestedPage = options.page ?? 1
      const requestedPerPage = options.perPage ?? expectedPerCountry

      expect(requestedPerPage).toBeLessThanOrEqual(100)
      expect(requestedPerPage).toBe(expectedPerCountry)

      callHistory[country].push(requestedPage)

      const start = (requestedPage - 1) * requestedPerPage
      const end = start + requestedPerPage
      const allPosts = postsByCountry[country]
      const slice = allPosts.slice(start, end)

      const results = slice.map((post) => ({
        id: Number(post.slug.replace(/\D+/g, "")) || 0,
        slug: post.slug,
        title: { rendered: post.title },
        excerpt: { rendered: `${post.title} excerpt` },
        content: { rendered: `${post.title} content` },
        date: post.date,
        link: `https://example.com/${country}/${post.slug}`,
        featured_media: 0,
        categories: [],
        tags: [],
        author: 1,
      }))

      return {
        results,
        total: allPosts.length,
        totalPages: Math.max(1, Math.ceil(allPosts.length / requestedPerPage)),
        currentPage: requestedPage,
        hasMore: end < allPosts.length,
        query,
        searchTime: 10,
      }
    })

    const requestUrl = `https://example.com/api/search?q=${query}&scope=pan&per_page=${perPage}&page=${page}`
    const response = await GET(new Request(requestUrl))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockSearchWordPressPosts).toHaveBeenCalledTimes(countryCodes.length * 4)

    countryCodes.forEach((code) => {
      expect(callHistory[code]).toEqual([1, 2, 3, 4])
    })

    expect(payload.results).toHaveLength(perPage)

    const allRecords = countryCodes.flatMap((code) =>
      postsByCountry[code].map((post) => ({
        objectID: `${code}:${post.slug}`,
        publishedAt: new Date(post.date).getTime(),
      })),
    )

    const expectedObjectIDs = allRecords
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice((page - 1) * perPage, page * perPage)
      .map((entry) => entry.objectID)

    const actualObjectIDs = payload.results.map((record: { objectID: string }) => record.objectID)
    expect(actualObjectIDs).toEqual(expectedObjectIDs)

    payload.results.forEach((record: { published_at: string }) => {
      expect(typeof record.published_at).toBe("string")
    })

    expect(payload.total).toBe(countryCodes.length * totalPostsPerCountry)
    expect(payload.totalPages).toBe(Math.max(1, Math.ceil(payload.total / perPage)))
    expect(payload.currentPage).toBe(page)
    expect(payload.hasMore).toBe(page < payload.totalPages)
    expect(payload.performance.source).toBe("wordpress")
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
