import { render, waitFor } from "@testing-library/react"
import { SWRConfig } from "swr"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { ReactNode } from "react"

vi.mock("@/lib/wordpress-api", () => ({
  getPostsByCategoryForCountry: vi.fn(),
}))

vi.mock("./CategoryPage", () => ({
  CategoryPage: () => <div data-testid="category-page" />,
}))

vi.mock("@/components/CategoryPageSkeleton", () => ({
  CategoryPageSkeleton: () => <div data-testid="category-skeleton" />,
}))

vi.mock("@/components/ErrorBoundary", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound called")
  }),
}))

import { getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import CategoryClientPage from "./CategoryClientPage"

const createCategoryData = () => ({
  category: { id: 1, name: "News", slug: "news", description: "" },
  posts: [],
  hasNextPage: false,
  endCursor: null,
})

describe("CategoryClientPage", () => {
  const getPostsByCategoryForCountryMock = vi.mocked(getPostsByCategoryForCountry)

  beforeEach(() => {
    window.history.pushState({}, "", "/za/category/news")
    window.localStorage.clear()
    document.cookie = "preferredCountry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    getPostsByCategoryForCountryMock.mockReset()
    getPostsByCategoryForCountryMock.mockResolvedValue(createCategoryData())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("fetches category data using the country from the current path", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <CategoryClientPage params={{ slug: "news" }} initialData={null} />
      </SWRConfig>,
    )

    await waitFor(() => expect(getPostsByCategoryForCountry).toHaveBeenCalled())
    expect(getPostsByCategoryForCountryMock.mock.calls[0]?.[0]).toBe("za")
  })
})
