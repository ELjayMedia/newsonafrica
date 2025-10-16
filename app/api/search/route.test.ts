import { describe, expect, beforeEach, it, vi } from "vitest"
import { NextRequest } from "next/server"
import type { SearchResponse } from "@/lib/wordpress-search"

vi.mock("@/lib/algolia/client", () => ({
  resolveSearchIndex: vi.fn(),
}))

vi.mock("@/lib/wordpress-search", () => ({
  searchWordPressPosts: vi.fn(),
  getSearchSuggestions: vi.fn(),
}))

vi.mock("@/utils/logger", () => ({
  default: {
    log: vi.fn(),
  },
}))

import { GET } from "./route"
import { resolveSearchIndex } from "@/lib/algolia/client"
import { searchWordPressPosts, getSearchSuggestions } from "@/lib/wordpress-search"

const mockResolveSearchIndex = vi.mocked(resolveSearchIndex)
const mockSearchWordPressPosts = vi.mocked(searchWordPressPosts)
const mockGetSearchSuggestions = vi.mocked(getSearchSuggestions)

const buildWpSearchResult = (country: string): SearchResponse => ({
  results: [
    {
      id: 1,
      slug: `${country}-post`,
      date: new Date("2024-01-01").toISOString(),
      link: "https://example.com",
      featured_media: 0,
      categories: [],
      tags: [],
      author: 1,
      title: { rendered: `${country.toUpperCase()} Headline` },
      excerpt: { rendered: `${country.toUpperCase()} excerpt` },
      content: { rendered: "<p>Example content</p>" },
      _embedded: undefined,
    },
  ],
  total: 1,
  totalPages: 1,
  currentPage: 1,
  hasMore: false,
  query: "", // unused in assertions
  searchTime: 5,
})

describe("GET /api/search WordPress fallback", () => {
  beforeEach(() => {
    mockResolveSearchIndex.mockReset()
    mockSearchWordPressPosts.mockReset()
    mockGetSearchSuggestions.mockReset()
  })

  it("uses the requested country when Algolia is unavailable", async () => {
    const country = "za"
    mockResolveSearchIndex.mockReturnValue(null)
    mockSearchWordPressPosts.mockResolvedValue(buildWpSearchResult(country))

    const request = new NextRequest(`https://example.com/api/search?q=economy&country=${country}`)
    const response = await GET(request)
    const payload = await response.json()

    expect(mockSearchWordPressPosts).toHaveBeenCalledWith("economy", expect.objectContaining({
      page: 1,
      perPage: 20,
      country,
    }))
    expect(payload.results[0].objectID).toBe(`${country}:${country}-post`)
  })

  it("uses the pan-African edition when scope requests it", async () => {
    mockResolveSearchIndex.mockReturnValue(null)
    mockSearchWordPressPosts.mockResolvedValue(buildWpSearchResult("pan"))

    const request = new NextRequest("https://example.com/api/search?q=economy&scope=pan")
    const response = await GET(request)
    const payload = await response.json()

    expect(mockSearchWordPressPosts).toHaveBeenCalledWith("economy", expect.objectContaining({
      page: 1,
      perPage: 20,
      country: "pan",
    }))
    expect(payload.results[0].objectID).toBe("pan:pan-post")
  })
})
