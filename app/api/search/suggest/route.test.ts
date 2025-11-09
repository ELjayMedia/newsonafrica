import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/algolia/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/algolia/client")>()
  return {
    ...actual,
    resolveSearchIndex: vi.fn(),
  }
})

vi.mock("@/lib/wordpress-search", () => ({
  getSearchSuggestions: vi.fn(),
  searchWordPressPosts: vi.fn(),
}))

vi.mock("../wordpress-fallback", () => ({
  executeWordPressSearchForScope: vi.fn(),
}))

const { GET, runtime } = await import("./route")
const { resolveSearchIndex } = await import("@/lib/algolia/client")
const { getSearchSuggestions } = await import("@/lib/wordpress-search")
const { executeWordPressSearchForScope } = await import("../wordpress-fallback")

const mockResolveSearchIndex = vi.mocked(resolveSearchIndex)
const mockGetSearchSuggestions = vi.mocked(getSearchSuggestions)
const mockExecuteWordPressSearchForScope = vi.mocked(executeWordPressSearchForScope)

describe("GET /api/search/suggest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveSearchIndex.mockReturnValue(null)
  })

  it("uses the edge runtime and caches responses for 30 seconds", async () => {
    const searchMock = vi.fn().mockResolvedValue({
      hits: [{ title: "Africa" }, { title: "Africa" }, { title: "Economy" }],
      nbHits: 3,
      nbPages: 1,
    })
    mockResolveSearchIndex.mockReturnValue({ search: searchMock } as any)

    const response = await GET(new Request("https://example.com/api/search/suggest?q=economy"))
    const payload = await response.json()

    expect(runtime).toBe("edge")
    expect(searchMock).toHaveBeenCalled()
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=60")
    expect(payload.suggestions).toEqual(["Africa", "Economy"])
  })

  it("falls back to WordPress pan-African suggestions when no Algolia index is available", async () => {
    mockExecuteWordPressSearchForScope.mockResolvedValue({
      suggestions: ["Climate Action", "Sustainable Development"],
      performance: { elapsedMs: 42 },
    } as any)

    const response = await GET(new Request("https://example.com/api/search/suggest?q=climate&scope=pan"))
    const payload = await response.json()

    expect(mockExecuteWordPressSearchForScope).toHaveBeenCalledWith(
      "climate",
      { type: "panAfrican" },
      1,
      10,
    )
    expect(mockGetSearchSuggestions).not.toHaveBeenCalled()
    expect(payload.suggestions).toEqual(["Climate Action", "Sustainable Development"])
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=60")
  })

  it("uses WordPress suggestions when Algolia search fails for a specific country", async () => {
    const failingSearch = vi.fn().mockRejectedValue(new Error("Algolia down"))
    mockResolveSearchIndex.mockReturnValue({ search: failingSearch } as any)
    mockGetSearchSuggestions.mockResolvedValue(["Election Update", "Election Tracker"])

    const response = await GET(
      new Request("https://example.com/api/search/suggest?query=Elections&country=ng"),
    )
    const payload = await response.json()

    expect(failingSearch).toHaveBeenCalled()
    expect(mockGetSearchSuggestions).toHaveBeenCalledWith("Elections", 10, "ng")
    expect(payload.suggestions).toEqual(["Election Update", "Election Tracker"])
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=60")
  })
})
