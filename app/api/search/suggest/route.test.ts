import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/wordpress-search", () => ({
  getSearchSuggestions: vi.fn(),
}))

vi.mock("../wordpress-fallback", () => ({
  executeWordPressSearchForScope: vi.fn(),
}))

const { GET, runtime } = await import("./route")
const { DEFAULT_COUNTRY } = await import("../shared")
const { getSearchSuggestions } = await import("@/lib/wordpress-search")
const { executeWordPressSearchForScope } = await import("../wordpress-fallback")

const mockGetSearchSuggestions = vi.mocked(getSearchSuggestions)
const mockExecuteWordPressSearchForScope = vi.mocked(executeWordPressSearchForScope)

describe("GET /api/search/suggest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the edge runtime, caches responses, and returns WordPress suggestions", async () => {
    mockGetSearchSuggestions.mockResolvedValue(["Africa", "Africa", "Economy"])

    const response = await GET(new Request("https://example.com/api/search/suggest?q=economy"))
    const payload = await response.json()

    expect(runtime).toBe("edge")
    expect(mockGetSearchSuggestions).toHaveBeenCalledWith("economy", 10, DEFAULT_COUNTRY)
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=60")
    expect(payload.suggestions).toEqual(["Africa", "Africa", "Economy"])
  })

  it("returns pan-African suggestions from the aggregated WordPress fallback", async () => {
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

  it("passes the country scope to the WordPress suggestion helper", async () => {
    mockGetSearchSuggestions.mockResolvedValue(["Election Update", "Election Tracker"])

    const response = await GET(
      new Request("https://example.com/api/search/suggest?query=Elections&country=ng"),
    )
    const payload = await response.json()

    expect(mockGetSearchSuggestions).toHaveBeenCalledWith("Elections", 10, "ng")
    expect(payload.suggestions).toEqual(["Election Update", "Election Tracker"])
  })

  it("returns an empty suggestion list when WordPress suggestion lookup fails", async () => {
    mockGetSearchSuggestions.mockRejectedValue(new Error("WordPress down"))

    const response = await GET(new Request("https://example.com/api/search/suggest?q=inflation"))
    const payload = await response.json()

    expect(payload.suggestions).toEqual([])
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=60")
  })
})
