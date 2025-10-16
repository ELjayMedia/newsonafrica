import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mockJsonWithCors = vi.fn(
  (_request: Request, data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json" },
    }),
)
const mockLogRequest = vi.fn()
const mockResolveSearchIndex = vi.fn()
const mockWpSearchPosts = vi.fn()
const mockWpGetSearchSuggestions = vi.fn()
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

vi.mock("@/lib/api-utils", () => ({
  jsonWithCors: mockJsonWithCors,
  logRequest: mockLogRequest,
}))

vi.mock("@/lib/search", () => ({
  stripHtml: (value: string) => value,
}))

vi.mock("@/lib/editions", () => ({
  SUPPORTED_COUNTRIES: [
    { code: "SZ", name: "Eswatini" },
    { code: "NG", name: "Nigeria" },
  ],
}))

vi.mock("@/lib/algolia/client", () => ({
  resolveSearchIndex: mockResolveSearchIndex,
}))

vi.mock("@/lib/wordpress-search", () => ({
  searchWordPressPosts: mockWpSearchPosts,
  getSearchSuggestions: mockWpGetSearchSuggestions,
}))

const routeModulePromise = import("./route")

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockJsonWithCors.mockImplementation(
      (_request: Request, data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { "content-type": "application/json" },
        }),
    )

    mockResolveSearchIndex.mockReturnValue(null)
    consoleErrorSpy.mockImplementation(() => {})
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it("sanitizes invalid pagination before calling WordPress search", async () => {
    const { GET } = await routeModulePromise

    mockWpSearchPosts.mockResolvedValue({
      results: [
        {
          id: 1,
          slug: "example",
          title: { rendered: "Example" },
          excerpt: { rendered: "Summary" },
          date: "2024-01-01T00:00:00.000Z",
          _embedded: { "wp:term": [[{ name: "News" }]] },
        },
      ],
      total: 1,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
      query: "example",
      searchTime: 10,
    })

    const request = new Request(
      "https://example.com/api/search?q=example&page=bogus&per_page=not-a-number",
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockWpSearchPosts).toHaveBeenCalledWith("example", {
      page: 1,
      perPage: 20,
      country: "sz",
    })
  })

  it("falls back to safe defaults when WordPress search fails", async () => {
    const { GET } = await routeModulePromise

    mockWpSearchPosts.mockRejectedValue(new Error("wp down"))

    const request = new Request(
      "https://example.com/api/search?q=welcome&page=bogus&per_page=also-bogus",
    )

    const response = await GET(request)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      currentPage: 1,
      performance: { source: "fallback" },
    })
    expect(Number.isFinite((payload.totalPages as number) ?? NaN)).toBe(true)
  })
})
