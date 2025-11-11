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
  mockFetchComments,
  mockCreateServerComponentSupabaseClient,
} = vi.hoisted(() => ({
  mockResolveEdition: vi.fn(),
  mockBuildArticleCountryPriority: vi.fn(),
  mockLoadArticleWithFallback: vi.fn(),
  mockGetRelatedPostsForCountry: vi.fn(),
  mockFetchComments: vi.fn(),
  mockCreateServerComponentSupabaseClient: vi.fn(),
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

vi.mock("@/lib/wordpress/posts", () => ({
  getRelatedPostsForCountry: (...args: unknown[]) => mockGetRelatedPostsForCountry(...args),
}))

vi.mock("@/lib/comment-service", () => ({
  fetchComments: (...args: unknown[]) => mockFetchComments(...args),
}))

vi.mock("@/lib/supabase/server-component-client", () => ({
  createServerComponentSupabaseClient: (...args: unknown[]) =>
    mockCreateServerComponentSupabaseClient(...args),
}))

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.local"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

import { fetchArticleWithFallbackAction, fetchCommentsPageAction } from "./actions"
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
      article: { id: "gid://wordpress/Post:42", databaseId: 42, title: "Test" },
      sourceCountry: "za",
      tags: ["edition:za:post:42"],
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

  it("throws a consistent error when no edition is resolved", async () => {
    mockResolveEdition.mockReturnValue(null)

    await expect(
      fetchArticleWithFallbackAction({ countryCode: "unknown", slug: "missing" }),
    ).rejects.toThrow(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  })

  it("throws a consistent error when the article cannot be found", async () => {
    mockResolveEdition.mockReturnValue({ code: "NG", type: "country" })
    mockBuildArticleCountryPriority.mockReturnValue(["ng"])
    mockLoadArticleWithFallback.mockResolvedValue(null)

    await expect(
      fetchArticleWithFallbackAction({ countryCode: "NG", slug: "missing" }),
    ).rejects.toThrow(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  })
})

describe("fetchCommentsPageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns fetched comments when Supabase is available", async () => {
    const supabase = { client: true } as any
    mockCreateServerComponentSupabaseClient.mockReturnValue(supabase)
    mockFetchComments.mockResolvedValue({
      comments: [{ id: "c1" }],
      hasMore: true,
      nextCursor: "cursor",
      total: 5,
    } as any)

    const result = await fetchCommentsPageAction({ postId: "42" })

    expect(mockCreateServerComponentSupabaseClient).toHaveBeenCalled()
    expect(mockFetchComments).toHaveBeenCalledWith("42", 0, 10, "newest", supabase, undefined)
    expect(result).toEqual({
      comments: [{ id: "c1" }],
      hasMore: true,
      nextCursor: "cursor",
      total: 5,
    })
  })

  it("returns an empty result when Supabase is unavailable", async () => {
    mockCreateServerComponentSupabaseClient.mockReturnValue(null)

    const result = await fetchCommentsPageAction({ postId: "42" })

    expect(result).toEqual({ comments: [], hasMore: false, nextCursor: null, total: 0 })
    expect(mockFetchComments).not.toHaveBeenCalled()
  })

  it("returns an empty result when Supabase configuration is missing", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const result = await fetchCommentsPageAction({ postId: "42" })

    expect(result).toEqual({ comments: [], hasMore: false, nextCursor: null, total: 0 })
    expect(mockCreateServerComponentSupabaseClient).not.toHaveBeenCalled()
    expect(mockFetchComments).not.toHaveBeenCalled()

    if (originalUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    }
    if (originalKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    }
  })

  it("swallows errors thrown during Supabase initialization", async () => {
    const error = new Error("supabase boom")
    mockCreateServerComponentSupabaseClient.mockImplementation(() => {
      throw error
    })
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await fetchCommentsPageAction({ postId: "42", page: 2 })

    expect(result).toEqual({ comments: [], hasMore: false, nextCursor: null, total: 0 })
    expect(mockFetchComments).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to initialize Supabase client", {
      error,
    })

    consoleErrorSpy.mockRestore()
  })
})
