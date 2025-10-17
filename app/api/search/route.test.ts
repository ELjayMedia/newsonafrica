import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mockJsonWithCors = vi.fn(
  (_request: Request, data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json" },
    }),
)
const mockLogRequest = vi.fn()
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

    consoleErrorSpy.mockImplementation(() => {})
    mockWpGetSearchSuggestions.mockResolvedValue([])
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
      suggestions: ["Example"],
    })
    mockWpGetSearchSuggestions.mockResolvedValue(["Example suggestion"])

    const request = new Request(
      "https://example.com/api/search?q=example&page=bogus&per_page=not-a-number",
    )

    const response = await GET(request)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(mockWpSearchPosts).toHaveBeenCalledWith("example", {
      page: 1,
      perPage: 20,
      country: "sz",
      orderBy: "relevance",
      order: "desc",
    })
    expect(mockWpGetSearchSuggestions).toHaveBeenCalledWith("example", 8, "sz")
    expect(payload).toMatchObject({
      total: 1,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
      suggestions: ["Example suggestion"],
    })
    expect((payload.performance as { source?: string })?.source).toBe("wordpress")
  })

  it("falls back to safe defaults when WordPress search fails", async () => {
    const { GET } = await routeModulePromise

    mockWpSearchPosts.mockRejectedValue(new Error("wp down"))
    mockWpGetSearchSuggestions.mockResolvedValue(["try again"]) 

    const request = new Request(
      "https://example.com/api/search?q=welcome&page=bogus&per_page=also-bogus",
    )

    const response = await GET(request)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      currentPage: 1,
      performance: { source: "fallback" },
      query: "welcome",
      suggestions: ["try again"],
    })
    expect(Number.isFinite((payload.totalPages as number) ?? NaN)).toBe(true)
  })

  it("uses record titles as fallback suggestions when WordPress suggestions are empty", async () => {
    const { GET } = await routeModulePromise

    mockWpSearchPosts.mockResolvedValue({
      results: [
        {
          id: 2,
          slug: "secondary",
          title: { rendered: "Secondary Result" },
          excerpt: { rendered: "Another summary" },
          date: "2024-02-01T00:00:00.000Z",
          _embedded: { "wp:term": [[{ name: "Politics" }]] },
        },
      ],
      total: 1,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
      query: "secondary",
      searchTime: 5,
      suggestions: [],
    })
    mockWpGetSearchSuggestions.mockResolvedValue([])

    const request = new Request("https://example.com/api/search?q=secondary")

    const response = await GET(request)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(mockWpGetSearchSuggestions).toHaveBeenCalledWith("secondary", 8, "sz")
    expect(payload).toMatchObject({
      suggestions: ["Secondary Result"],
    })
  })

  it("returns suggestions without triggering a full search when suggestions=true", async () => {
    const { GET } = await routeModulePromise

    mockWpGetSearchSuggestions.mockResolvedValue(["first", "second"])

    const request = new Request("https://example.com/api/search?q=query&suggestions=true")

    const response = await GET(request)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(mockWpSearchPosts).not.toHaveBeenCalled()
    expect(mockWpGetSearchSuggestions).toHaveBeenCalledWith("query", 8, "sz")
    expect(payload).toMatchObject({
      suggestions: ["first", "second"],
      performance: { source: "wordpress" },
    })
  })
})
