import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const notFoundMock = vi.fn<never, []>()

const mocks = vi.hoisted(() => ({
  getPostsByCategoryForCountry: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}))

vi.mock("@/lib/wordpress-api", () => ({
  getPostsByCategoryForCountry: mocks.getPostsByCategoryForCountry,
}))

vi.mock("@/components/category/CategoryClientPage", () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="category-client-page" />),
}))

describe("CountryCategoryPage", () => {
  beforeEach(() => {
    vi.resetModules()
    notFoundMock.mockReset()
    mocks.getPostsByCategoryForCountry.mockReset()
  })

  it("invokes notFound when the category is missing", async () => {
    const notFoundError = new Error("NEXT_NOT_FOUND")
    notFoundMock.mockImplementation(() => {
      throw notFoundError
    })
    mocks.getPostsByCategoryForCountry.mockResolvedValue({ category: null, posts: [] })

    const { default: CountryCategoryPage } = await import("./page")

    await expect(
      CountryCategoryPage({ params: Promise.resolve({ countryCode: "ng", slug: "politics" }) }),
    ).rejects.toBe(notFoundError)

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(mocks.getPostsByCategoryForCountry).toHaveBeenCalledWith("ng", "politics", 20)
  })

  it("propagates errors when fetching category data fails", async () => {
    const fetchError = new Error("network failure")
    mocks.getPostsByCategoryForCountry.mockRejectedValue(fetchError)
    notFoundMock.mockImplementation(() => {
      throw new Error("notFound should not be called")
    })

    const { default: CountryCategoryPage } = await import("./page")

    await expect(
      CountryCategoryPage({ params: Promise.resolve({ countryCode: "ng", slug: "politics" }) }),
    ).rejects.toBe(fetchError)

    expect(notFoundMock).not.toHaveBeenCalled()
  })
})
