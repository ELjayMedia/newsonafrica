// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

import { SITEMAP_RECENT_POST_LIMIT } from "@/config/sitemap"

const mockFetchRecentPosts = vi.fn()
const mockFetchCategories = vi.fn()
const mockFetchTags = vi.fn()
const mockFetchAuthors = vi.fn()
const mockFetchCountries = vi.fn()

vi.mock("@/lib/wordpress/service", () => ({
  fetchRecentPosts: mockFetchRecentPosts,
  fetchCategories: mockFetchCategories,
  fetchTags: mockFetchTags,
  fetchAuthors: mockFetchAuthors,
  fetchCountries: mockFetchCountries,
}))

beforeEach(() => {
  mockFetchRecentPosts.mockReset()
  mockFetchCategories.mockReset()
  mockFetchTags.mockReset()
  mockFetchAuthors.mockReset()
  mockFetchCountries.mockReset()

  const now = new Date().toISOString()

  mockFetchRecentPosts.mockResolvedValue([
    {
      slug: "sample-post",
      title: "Sample Post",
      date: now,
      modified: now,
      categories: { nodes: [] },
      featuredImage: null,
    },
  ])

  mockFetchCategories.mockResolvedValue([{ slug: "news" }])
  mockFetchTags.mockResolvedValue([{ slug: "tag" }])
  mockFetchAuthors.mockResolvedValue([{ slug: "author" }])
  mockFetchCountries.mockResolvedValue([{ code: "ng" }])
})

describe("sitemap fetch limits", () => {
  it("limits the metadata sitemap to the recent post window", async () => {
    const { default: buildMetadataSitemap } = await import("@/app/sitemap")

    await buildMetadataSitemap()

    expect(mockFetchRecentPosts).toHaveBeenCalledWith(
      SITEMAP_RECENT_POST_LIMIT,
    )
  })

  it("limits the server sitemap to the recent post window", async () => {
    const { GET } = await import("@/app/server-sitemap.xml/route")

    const response = await GET()

    expect(mockFetchRecentPosts).toHaveBeenCalledWith(
      SITEMAP_RECENT_POST_LIMIT,
    )
    expect(response.status).toBe(200)
  })
})
