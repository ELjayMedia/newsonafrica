import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

import type { AggregatedHomeData } from "../(home)/home-data"

vi.mock("server-only", () => ({}))

const heroMock = vi.fn(() => <div data-testid="hero">Hero</div>)
const trendingMock = vi.fn(() => <div data-testid="trending">Trending</div>)
const latestMock = vi.fn(() => <div data-testid="latest">Latest</div>)

const notFoundMock = vi.fn<never, []>()

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}))

vi.mock("@/lib/site-url", () => ({
  getSiteBaseUrl: () => "https://example.com",
  SITE_BASE_URL: "https://example.com",
}))

vi.mock("../(home)/HeroSection", () => ({
  HeroSection: heroMock,
}))

vi.mock("../(home)/TrendingSection", () => ({
  TrendingSection: trendingMock,
}))

vi.mock("../(home)/LatestGridSection", () => ({
  LatestGridSection: latestMock,
}))

const fetchAggregatedHomeMock = vi.fn<Promise<AggregatedHomeData>, [string, string[]]>()
const fetchAggregatedHomeForCountryMock = vi.fn<Promise<AggregatedHomeData>, [string]>()

vi.mock("../(home)/home-data", async () => {
  const actual = await vi.importActual<typeof import("../(home)/home-data")>("../(home)/home-data")

  return {
    ...actual,
    fetchAggregatedHome: fetchAggregatedHomeMock,
    fetchAggregatedHomeForCountry: fetchAggregatedHomeForCountryMock,
  }
})

const MOCK_AGGREGATED_HOME: AggregatedHomeData = {
  heroPost: {
    id: "hero",
    slug: "hero-story",
    title: "Hero Story",
    excerpt: "<p>Lead</p>",
    date: "2024-01-01T00:00:00.000Z",
  },
  secondaryPosts: [
    {
      id: "secondary",
      slug: "secondary-story",
      title: "Second Story",
      excerpt: "<p>Summary</p>",
      date: "2024-01-02T00:00:00.000Z",
    },
  ],
  remainingPosts: [
    {
      id: "remaining",
      slug: "more-story",
      title: "More Story",
      excerpt: "<p>More</p>",
      date: "2024-01-03T00:00:00.000Z",
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()

  fetchAggregatedHomeMock.mockResolvedValue(MOCK_AGGREGATED_HOME)
  fetchAggregatedHomeForCountryMock.mockResolvedValue(MOCK_AGGREGATED_HOME)

  notFoundMock.mockImplementation(() => {
    throw new Error("notFound called")
  })
})

afterEach(() => {
  cleanup()
})

describe("CountryPage", () => {
  it.each([
    ["sz"],
    ["za"],
  ])("renders the same structure as the home page for %s", async (countryCode) => {
    const { default: HomePage } = await import("../page")
    const { default: CountryPage } = await import("./page")

    const homeUi = await HomePage()
    const homeRender = render(homeUi)
    const homeHtml = homeRender.container.innerHTML
    homeRender.unmount()

    const countryUi = await CountryPage({ params: { countryCode } })
    const countryRender = render(countryUi)

    expect(countryRender.container.innerHTML).toBe(homeHtml)
    expect(fetchAggregatedHomeMock).toHaveBeenCalledTimes(1)
    expect(fetchAggregatedHomeForCountryMock).toHaveBeenCalledWith(countryCode)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it("invokes notFound for unsupported country codes", async () => {
    const { default: CountryPage } = await import("./page")

    const notFoundError = new Error("NEXT_NOT_FOUND")
    notFoundMock.mockImplementation(() => {
      throw notFoundError
    })

    await expect(CountryPage({ params: { countryCode: "gh" } })).rejects.toThrow(notFoundError)

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(fetchAggregatedHomeForCountryMock).not.toHaveBeenCalled()
  })
})
