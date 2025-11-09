import { beforeEach, describe, expect, it, vi } from "vitest"

import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import type { SearchResponse } from "@/lib/wordpress-search"

vi.mock("@/lib/wordpress-search", () => ({
  searchWordPressPosts: vi.fn(),
}))

const { GET, MAX_PAGES_PER_COUNTRY, runtime } = await import("./route")
const { searchWordPressPosts } = await import("@/lib/wordpress-search")

const mockSearchWordPressPosts = vi.mocked(searchWordPressPosts)

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the node runtime and sets no-store cache headers", async () => {
    const now = new Date().toISOString()
    mockSearchWordPressPosts.mockResolvedValue({
      results: [
        {
          id: 1,
          slug: "cache-test",
          title: { rendered: "Cache Test" },
          excerpt: { rendered: "Cache Excerpt" },
          content: { rendered: "Cache Content" },
          date: now,
          link: "https://example.com/cache-test",
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
      query: "cache",
      searchTime: 5,
    })

    const response = await GET(new Request("https://example.com/api/search?q=cache"))

    expect(runtime).toBe("nodejs")
    expect(mockSearchWordPressPosts).toHaveBeenCalledWith(
      "cache",
      expect.objectContaining({ page: 1, perPage: 20 }),
    )
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, no-cache, must-revalidate")
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
      Math.max(
        perPage,
        Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1))),
      ),
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
    const response = await searchGET(new Request(requestUrl))
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
      Math.max(
        perPage,
        Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1))),
      ),
    )

    const totalPostsPerCountry = expectedPerCountry * (MAX_PAGES_PER_COUNTRY + 2)
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
    const response = await searchGET(new Request(requestUrl))
    const payload = await response.json()

    expect(response.status).toBe(200)
    const totalCalls = mockSearchWordPressPosts.mock.calls.length
    expect(totalCalls).toBeLessThanOrEqual(countryCodes.length * MAX_PAGES_PER_COUNTRY)

    countryCodes.forEach((code) => {
      const pages = callHistory[code]
      expect(pages.length).toBeLessThanOrEqual(MAX_PAGES_PER_COUNTRY)
      expect(pages).toEqual([...pages].sort((a, b) => a - b))
      if (pages.length > 0) {
        expect(pages[0]).toBe(1)
      }
    })

    expect(
      Object.values(callHistory).some((pages) => pages.length === MAX_PAGES_PER_COUNTRY),
    ).toBe(true)

    expect(payload.results).toHaveLength(perPage)

    const truncatedRecords = countryCodes.flatMap((code) =>
      postsByCountry[code]
        .slice(0, MAX_PAGES_PER_COUNTRY * expectedPerCountry)
        .map((post) => ({
          objectID: `${code}:${post.slug}`,
          publishedAt: new Date(post.date).getTime(),
        })),
    )

    const expectedObjectIDs = truncatedRecords
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
    expect(payload.performance.wordpressRequestCount).toBe(totalCalls)
    expect(payload.performance.wordpressRequestBudget).toBeGreaterThanOrEqual(totalCalls)
    expect(typeof payload.performance.wordpressBudgetExhausted).toBe("boolean")
  })

  it("stops fetching when WordPress keeps reporting more pages but limits are reached", async () => {
    const query = "budget"
    const perPage = 20
    const page = 3
    const countryCodes = SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase())
    const desiredTotal = perPage * page
    const basePerCountry = Math.ceil(desiredTotal / countryCodes.length)
    const expectedPerCountry = Math.min(
      100,
      Math.max(
        perPage,
        Math.max(1, basePerCountry + Math.max(2, Math.ceil(basePerCountry * 0.1))),
      ),
    )
    const totalPagesAvailable = MAX_PAGES_PER_COUNTRY + 4

    const postsByCountry: Record<string, Array<{ date: string; title: string; slug: string }>> = {}
    const callHistory: Record<string, number[]> = {}
    const startDate = Date.UTC(2024, 6, 1)

    countryCodes.forEach((code, countryIndex) => {
      const posts: Array<{ date: string; title: string; slug: string }> = []
      for (let pageIndex = 0; pageIndex < totalPagesAvailable; pageIndex += 1) {
        for (let itemIndex = 0; itemIndex < expectedPerCountry; itemIndex += 1) {
          const sequence =
            countryIndex * totalPagesAvailable * expectedPerCountry + pageIndex * expectedPerCountry + itemIndex
          const date = new Date(startDate - sequence * 60 * 60 * 1000).toISOString()
          posts.push({
            date,
            title: `${code.toUpperCase()} Budget Insight ${sequence + 1}`,
            slug: `${code}-budget-${sequence + 1}`,
          })
        }
      }
      postsByCountry[code] = posts
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
        hasMore: requestedPage < totalPagesAvailable,
        query,
        searchTime: 12,
      }
    })

    const requestUrl = `https://example.com/api/search?q=${query}&scope=pan&per_page=${perPage}&page=${page}`
    const response = await searchGET(new Request(requestUrl))
    const payload = await response.json()

    expect(response.status).toBe(200)

    countryCodes.forEach((code) => {
      const pages = callHistory[code]
      expect(pages.length).toBeLessThanOrEqual(MAX_PAGES_PER_COUNTRY)
      expect(pages.length).toBeLessThan(totalPagesAvailable)
      expect(pages).toEqual(Array.from({ length: pages.length }, (_, index) => index + 1))
    })

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

    const totalCalls = mockSearchWordPressPosts.mock.calls.length

    expect(payload.performance.source).toBe("wordpress")
    expect(payload.performance.wordpressBudgetExhausted).toBe(true)
    expect(payload.performance.wordpressRequestCount).toBe(totalCalls)
    expect(totalCalls).toBeLessThanOrEqual(SUPPORTED_COUNTRIES.length * MAX_PAGES_PER_COUNTRY)
    expect(payload.performance.wordpressRequestBudget).toBe(
      SUPPORTED_COUNTRIES.length * MAX_PAGES_PER_COUNTRY,
    )
  })
})
