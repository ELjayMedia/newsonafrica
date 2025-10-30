import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const redirectMock = vi.fn<never, [string]>()
const notFoundMock = vi.fn<never, []>()

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

const buildArticleCountryPriorityMock = vi.fn<(country: string) => string[]>()
const loadArticleWithFallbackMock = vi.fn<
  Promise<{ article: unknown; sourceCountry: string } | null>,
  [string, string[]]
>()
const normalizeSlugMock = vi.fn((value: string) => value.toLowerCase())
const normalizeCountryCodeMock = vi.fn((value: string) => value.toLowerCase())

vi.mock("@/app/[countryCode]/article/[slug]/article-data", () => ({
  buildArticleCountryPriority: buildArticleCountryPriorityMock,
  loadArticleWithFallback: loadArticleWithFallbackMock,
  normalizeSlug: normalizeSlugMock,
  normalizeCountryCode: normalizeCountryCodeMock,
  PLACEHOLDER_IMAGE_PATH: "/news-placeholder.png",
}))

describe("ArticleRedirectPage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"

    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })

    buildArticleCountryPriorityMock.mockReturnValue(["sz", "za", "african-edition"])
    normalizeSlugMock.mockImplementation((value: string) => value.toLowerCase())
    normalizeCountryCodeMock.mockImplementation((value: string) => value.toLowerCase())
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEFAULT_SITE
  })

  it("redirects to the resolved country article path", async () => {
    loadArticleWithFallbackMock.mockResolvedValue({ article: {}, sourceCountry: "za" })

    const { default: ArticleRedirectPage } = await import("./page")

    await expect(
      ArticleRedirectPage({ params: Promise.resolve({ slug: "Breaking-News" }) }),
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(normalizeSlugMock).toHaveBeenCalledWith("Breaking-News")
    expect(buildArticleCountryPriorityMock).toHaveBeenCalledWith("sz")
    expect(loadArticleWithFallbackMock).toHaveBeenCalledWith("breaking-news", [
      "sz",
      "za",
      "african-edition",
    ])
    expect(redirectMock).toHaveBeenCalledWith("/za/article/breaking-news")
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it("redirects african edition articles to the alias route", async () => {
    loadArticleWithFallbackMock.mockResolvedValue({
      article: {},
      sourceCountry: "african-edition",
    })

    const { default: ArticleRedirectPage } = await import("./page")

    await expect(
      ArticleRedirectPage({ params: Promise.resolve({ slug: "Pan-Africa" }) }),
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(redirectMock).toHaveBeenCalledWith("/african/article/pan-africa")
  })

  it("invokes notFound when the article cannot be located", async () => {
    loadArticleWithFallbackMock.mockResolvedValue(null)

    const { default: ArticleRedirectPage } = await import("./page")

    await expect(
      ArticleRedirectPage({ params: Promise.resolve({ slug: "missing-post" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it("invokes notFound when the slug normalizes to an empty value", async () => {
    normalizeSlugMock.mockReturnValueOnce("")

    const { default: ArticleRedirectPage } = await import("./page")

    await expect(
      ArticleRedirectPage({ params: Promise.resolve({ slug: "   " }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(loadArticleWithFallbackMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
