import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const notFoundMock = vi.fn<never, []>()

const mocks = vi.hoisted(() => ({
  getCategoryPageData: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}))

vi.mock("@/lib/data/category", () => ({
  getCategoryPageData: mocks.getCategoryPageData,
}))

vi.mock("@/components/category/CategoryHeader", () => ({
  CategoryHeader: (props: Record<string, unknown>) => <div data-testid="category-header" {...props} />,
}))

vi.mock("@/components/posts/PostList", () => ({
  PostList: (props: Record<string, unknown>) => <div data-testid="post-list" {...props} />,
}))

vi.mock("@/components/category/EmptyState", () => ({
  EmptyState: (props: Record<string, unknown>) => <div data-testid="empty-state" {...props} />,
}))

vi.mock("@/components/category/ErrorState", () => ({
  ErrorState: (props: Record<string, unknown>) => <div data-testid="error-state" {...props} />,
}))

vi.mock("@/components/category/LoadMoreClient", () => ({
  LoadMoreClient: (props: Record<string, unknown>) => <div data-testid="load-more" {...props} />,
}))

describe("CountryCategoryPage", () => {
  beforeEach(() => {
    vi.resetModules()
    notFoundMock.mockReset()
    mocks.getCategoryPageData.mockReset()
  })

  it("exports incremental cache configuration", async () => {
    const pageModule = await import("./page")
    const categoriesModule = await import("@/lib/wp-server/categories")

    expect(pageModule.dynamic).toBeUndefined()
    expect(pageModule.revalidate).toBe(categoriesModule.CATEGORY_PAGE_REVALIDATE)
  })

  it("invokes notFound when the category is missing", async () => {
    const notFoundError = new Error("NEXT_NOT_FOUND")
    notFoundMock.mockImplementation(() => {
      throw notFoundError
    })
    mocks.getCategoryPageData.mockResolvedValue({ kind: "not-found" })

    const { default: CountryCategoryPage } = await import("./page")

    await expect(
      CountryCategoryPage({ params: Promise.resolve({ countryCode: "ng", slug: "politics" }) }),
    ).rejects.toBe(notFoundError)

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(mocks.getCategoryPageData).toHaveBeenCalledWith("ng", "politics", 20)
  })

  it("renders the page when data is available", async () => {
    mocks.getCategoryPageData.mockResolvedValue({
      kind: "success",
      category: { name: "Politics", slug: "politics", href: "/ng/category/politics" },
      posts: [{ id: "1", slug: "post", title: "Post", excerpt: "Excerpt", href: "/ng/article/post", categories: [], countryCode: "ng" }],
      relatedCategories: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    })

    const { default: CountryCategoryPage } = await import("./page")

    const result = await CountryCategoryPage({ params: Promise.resolve({ countryCode: "ng", slug: "politics" }) })

    expect(result).toMatchSnapshot()
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it("renders the error state when fetching fails", async () => {
    const fetchError = new Error("network failure")
    mocks.getCategoryPageData.mockRejectedValue(fetchError)

    const { default: CountryCategoryPage } = await import("./page")

    const result = await CountryCategoryPage({ params: Promise.resolve({ countryCode: "ng", slug: "politics" }) })

    expect(result).toMatchSnapshot()
    expect(notFoundMock).not.toHaveBeenCalled()
  })
})
