import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  jsonWithCorsMock: vi.fn(
    (_request: Request, body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: init?.headers,
      }),
  ),
  logRequestMock: vi.fn(),
  resolveSearchIndexMock: vi.fn(),
  wpSearchPostsMock: vi.fn(),
  wpGetSearchSuggestionsMock: vi.fn(),
}))

vi.mock("@/lib/api-utils", () => ({
  jsonWithCors: mocks.jsonWithCorsMock,
  logRequest: mocks.logRequestMock,
}))

vi.mock("@/lib/algolia/client", () => ({
  resolveSearchIndex: mocks.resolveSearchIndexMock,
}))

vi.mock("@/lib/wordpress-search", () => ({
  searchWordPressPosts: mocks.wpSearchPostsMock,
  getSearchSuggestions: mocks.wpGetSearchSuggestionsMock,
}))

vi.mock("@/lib/editions", () => ({
  SUPPORTED_COUNTRIES: [{ code: "sz" }],
}))

import { GET } from "./route"

describe("GET /api/search", () => {
  beforeEach(() => {
    mocks.jsonWithCorsMock.mockClear()
    mocks.logRequestMock.mockClear()
    mocks.resolveSearchIndexMock.mockReset()
    mocks.wpSearchPostsMock.mockReset()
    mocks.wpGetSearchSuggestionsMock.mockReset()
  })

  it("returns 400 when the query parameter is missing", async () => {
    const response = await GET(new Request("https://example.com/api/search"))

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload).toEqual({ error: "Missing search query" })
  })

  it("normalizes pagination and forwards the request to WordPress when Algolia is unavailable", async () => {
    mocks.resolveSearchIndexMock.mockReturnValue(null)
    mocks.wpSearchPostsMock.mockResolvedValue({
      results: [
        {
          id: 101,
          slug: "hello-world",
          title: { rendered: "<strong>Hello</strong>" },
          excerpt: { rendered: "<p>World news</p>" },
          date: "2024-07-01T00:00:00.000Z",
          _embedded: { "wp:term": [[]] },
        },
      ],
      total: 1,
      totalPages: 1,
      currentPage: 0,
      hasMore: false,
      query: "Hello",
      searchTime: 42,
    })

    const response = await GET(
      new Request("https://example.com/api/search?q=%20Hello%20&page=0&per_page=500&country=unknown&sort=latest"),
    )

    expect(response.status).toBe(200)
    expect(mocks.wpSearchPostsMock).toHaveBeenCalledWith("Hello", {
      page: 1,
      perPage: 100,
      orderBy: "date",
      order: "desc",
    })

    const payload = await response.json()
    expect(payload.query).toBe("Hello")
    expect(payload.currentPage).toBe(1)
    expect(payload.totalPages).toBe(1)
    expect(payload.results).toHaveLength(1)
    expect(payload.results[0].title).toBe("Hello")
    expect(payload.results[0].excerpt).toBe("World news")
  })

  it("provides a static fallback when both Algolia and WordPress searches fail", async () => {
    mocks.resolveSearchIndexMock.mockReturnValue({
      search: vi.fn().mockRejectedValue(new Error("boom")),
    })
    mocks.wpSearchPostsMock.mockRejectedValue(new Error("wp down"))

    const response = await GET(new Request("https://example.com/api/search?q=news"))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.query).toBe("news")
    expect(payload.results.length).toBeGreaterThan(0)
    expect(payload.performance.source).toBe("fallback")
  })
})
