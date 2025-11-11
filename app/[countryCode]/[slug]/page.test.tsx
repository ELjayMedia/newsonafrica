import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  loadArticleWithFallback: vi.fn(),
  resolveEdition: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("../article/[slug]/article-data", () => ({
  buildArticleCountryPriority: (country: string) => [country],
  loadArticleWithFallback: (...args: unknown[]) => mocks.loadArticleWithFallback(...args),
  normalizeCountryCode: (value: string) => value.toLowerCase(),
  normalizeRouteCountry: (value: string) => value.toLowerCase(),
  normalizeSlug: (value: string) => value.toLowerCase(),
  resolveEdition: (...args: unknown[]) => mocks.resolveEdition(...args),
}))

import Page from "./page"
import { notFound, redirect } from "next/navigation"

describe("LegacyArticleRedirect", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadArticleWithFallback.mockReset()
    mocks.resolveEdition.mockReset()
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })
  })

  const callPage = (countryCode: string, slug: string) =>
    Page({ params: Promise.resolve({ countryCode, slug }) })

  it("returns notFound for reserved slugs", async () => {
    await expect(callPage("sz", "article")).rejects.toThrow("NEXT_NOT_FOUND")
    expect(notFound).toHaveBeenCalledTimes(1)
    expect(mocks.resolveEdition).not.toHaveBeenCalled()
    expect(mocks.loadArticleWithFallback).not.toHaveBeenCalled()
  })

  it("returns notFound when edition cannot be resolved", async () => {
    mocks.resolveEdition.mockReturnValue(null)

    await expect(callPage("zz", "hello")).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mocks.resolveEdition).toHaveBeenCalledWith("zz")
    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it("redirects to the resolved article route", async () => {
    mocks.resolveEdition.mockReturnValue({ code: "SZ" } as any)
    mocks.loadArticleWithFallback.mockResolvedValue({
      status: "found",
      sourceCountry: "sz",
      article: { id: "1", slug: "hello" },
      tags: [],
    } as any)

    await expect(callPage("sz", "Hello"))
      .rejects.toThrow("NEXT_REDIRECT")

    expect(mocks.loadArticleWithFallback).toHaveBeenCalledWith("hello", ["sz"])
    expect(redirect).toHaveBeenCalledWith("/sz/article/hello")
  })

  it("redirects using fallback country when provided", async () => {
    mocks.resolveEdition.mockReturnValue({ code: "SZ" } as any)
    mocks.loadArticleWithFallback.mockResolvedValue({
      status: "found",
      sourceCountry: "za",
      article: { id: "1", slug: "hello" },
      tags: [],
    } as any)

    await expect(callPage("sz", "Hello"))
      .rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/za/article/hello")
  })

  it("redirects even when article loads with temporary error but has stale country", async () => {
    mocks.resolveEdition.mockReturnValue({ code: "SZ" } as any)
    mocks.loadArticleWithFallback.mockResolvedValue({
      status: "temporary_error",
      error: new Error("temporary"),
      failures: [],
      staleArticle: { id: "1", slug: "hello" },
      staleSourceCountry: "ke",
    } as any)

    await expect(callPage("sz", "Hello"))
      .rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/ke/article/hello")
  })

  it("falls back to edition country when temporary error lacks stale info", async () => {
    mocks.resolveEdition.mockReturnValue({ code: "SZ" } as any)
    mocks.loadArticleWithFallback.mockResolvedValue({
      status: "temporary_error",
      error: new Error("temporary"),
      failures: [],
    } as any)

    await expect(callPage("sz", "Hello"))
      .rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/sz/article/hello")
  })

  it("returns notFound when article is missing", async () => {
    mocks.resolveEdition.mockReturnValue({ code: "SZ" } as any)
    mocks.loadArticleWithFallback.mockResolvedValue({ status: "not_found" } as any)

    await expect(callPage("sz", "missing")).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFound).toHaveBeenCalledTimes(1)
  })
})
