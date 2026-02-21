import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  ENV: {
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    NEXT_PUBLIC_DEFAULT_SITE: "sz",
    NEXT_PUBLIC_WP_SZ_GRAPHQL: undefined,
    NEXT_PUBLIC_WP_ZA_GRAPHQL: undefined,
    ANALYTICS_API_BASE_URL: "https://example.com/api/analytics",
    WORDPRESS_REQUEST_TIMEOUT_MS: 30_000,
  },
}))

const {
  mockResolveEdition,
  mockBuildArticleCountryPriority,
  mockLoadArticleWithFallback,
  mockGetRelatedPostsForCountry,
} = vi.hoisted(() => ({
  mockResolveEdition: vi.fn(),
  mockBuildArticleCountryPriority: vi.fn(),
  mockLoadArticleWithFallback: vi.fn(),
  mockGetRelatedPostsForCountry: vi.fn(),
}))

vi.mock("./article-data", async () => {
  const actual = await vi.importActual<typeof import("./article-data")>("./article-data")
  return {
    ...actual,
    resolveEdition: mockResolveEdition,
    buildArticleCountryPriority: mockBuildArticleCountryPriority,
    loadArticleWithFallback: mockLoadArticleWithFallback,
  }
})

vi.mock("@/lib/wordpress/service", () => ({
  getRelatedPostsForCountry: (...args: unknown[]) => mockGetRelatedPostsForCountry(...args),
}))

vi.mock("@/lib/comment-service", () => ({
  fetchComments: vi.fn(),
}))

vi.mock("@/lib/supabase/server-component-client", () => ({
  createServerComponentSupabaseClient: vi.fn(),
}))

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://supabase.local"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key"

import { fetchArticleWithFallbackAction } from "./actions"
import { ARTICLE_NOT_FOUND_ERROR_MESSAGE } from "./constants"

describe("fetchArticleWithFallbackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("resolves article data, source country, and related posts using the fallback chain", async () => {
    const edition = { code: "NG", type: "country" } as const
    mockResolveEdition.mockReturnValue(edition)
    mockBuildArticleCountryPriority.mockReturnValue(["ng", "za"])
    mockLoadArticleWithFallback.mockResolvedValue({
      status: "found",
      article: { id: "gid://wordpress/Post:42", databaseId: 42, title: "Test" },
      sourceCountry: "za",
      tags: ["edition:za:post:42"],
      canonicalCountry: "za",
      version: "2024-05-01t00-00-00z",
    })
    const relatedPosts = [{ id: "r1" }]
    mockGetRelatedPostsForCountry.mockResolvedValue(relatedPosts)

    const result = await fetchArticleWithFallbackAction({ countryCode: "NG", slug: "Some-Slug" })

    expect(mockResolveEdition).toHaveBeenCalledWith("NG")
    expect(mockBuildArticleCountryPriority).toHaveBeenCalledWith("ng")
    expect(mockLoadArticleWithFallback).toHaveBeenCalledWith("some-slug", ["ng", "za"])
    expect(mockGetRelatedPostsForCountry).toHaveBeenCalledWith("za", 42, 6)
    expect(result).toEqual({
      article: { id: "gid://wordpress/Post:42", databaseId: 42, title: "Test" },
      sourceCountry: "za",
      relatedPosts,
    })
  })

  it("returns null article with temporary error details when refresh fails", async () => {
    const edition = { code: "NG", type: "country" } as const
    mockResolveEdition.mockReturnValue(edition)
    mockBuildArticleCountryPriority.mockReturnValue(["ng"])
    mockLoadArticleWithFallback.mockResolvedValue({
      status: "temporary_error",
      error: new Error("Temporary"),
      failures: [{ country: "ng", error: new Error("Outage") }],
    })

    const result = await fetchArticleWithFallbackAction({ countryCode: "NG", slug: "Some-Slug" })

    expect(mockGetRelatedPostsForCountry).not.toHaveBeenCalled()
    expect(result).toEqual({
      article: null,
      sourceCountry: "ng",
      relatedPosts: [],
      error: {
        type: "temporary_error",
        message: "Temporary",
      },
    })
  })

  it("throws a consistent error when no edition is resolved", async () => {
    mockResolveEdition.mockReturnValue(null)

    await expect(
      fetchArticleWithFallbackAction({ countryCode: "unknown", slug: "missing" }),
    ).rejects.toThrow(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  })

  it("throws a consistent error when the article cannot be found", async () => {
    mockResolveEdition.mockReturnValue({ code: "NG", type: "country" })
    mockBuildArticleCountryPriority.mockReturnValue(["ng"])
    mockLoadArticleWithFallback.mockResolvedValue({ status: "not_found" })

    await expect(
      fetchArticleWithFallbackAction({ countryCode: "NG", slug: "missing" }),
    ).rejects.toThrow(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  })
})
