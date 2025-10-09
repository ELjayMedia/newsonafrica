import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { HOME_FEED_CACHE_TAGS, type AggregatedHomeData } from "../(home)/home-data"

vi.mock("server-only", () => ({}))

const heroMock = vi.fn(() => <div data-testid="hero">Hero</div>)
const trendingMock = vi.fn(() => <div data-testid="trending">Trending</div>)
const latestMock = vi.fn(() => <div data-testid="latest">Latest</div>)

const notFoundMock = vi.fn<never, []>()

const { fetchAggregatedHomeMock, fetchAggregatedHomeForCountryMock } = vi.hoisted(() => ({
  fetchAggregatedHomeMock: vi.fn<Promise<AggregatedHomeData>, [string, string[]]>(),
  fetchAggregatedHomeForCountryMock: vi.fn<Promise<AggregatedHomeData>, [string]>(),
}))

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
    ["sz", "sz"],
    ["ZA", "za"],
  ])("renders the hero, trending and latest sections for %s", async (countryCode, expectedCode) => {
    const { default: CountryPage } = await import("./page")

    const countryUi = await CountryPage({ params: { countryCode } })
    const { getByTestId } = render(countryUi)

    expect(getByTestId("hero")).toBeInTheDocument()
    expect(getByTestId("trending")).toBeInTheDocument()
    expect(getByTestId("latest")).toBeInTheDocument()
    expect(fetchAggregatedHomeMock).not.toHaveBeenCalled()
    expect(fetchAggregatedHomeForCountryMock).toHaveBeenCalledWith(expectedCode)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it("renders the African edition using the aggregated home feed", async () => {
    const { default: CountryPage } = await import("./page")

    const countryUi = await CountryPage({ params: { countryCode: "african-edition" } })
    const { getByTestId } = render(countryUi)

    expect(getByTestId("hero")).toBeInTheDocument()
    expect(getByTestId("trending")).toBeInTheDocument()
    expect(getByTestId("latest")).toBeInTheDocument()
    expect(fetchAggregatedHomeMock).toHaveBeenCalledTimes(1)
    expect(fetchAggregatedHomeMock).toHaveBeenCalledWith("https://example.com", HOME_FEED_CACHE_TAGS)
    expect(fetchAggregatedHomeForCountryMock).not.toHaveBeenCalled()
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
    expect(fetchAggregatedHomeMock).not.toHaveBeenCalled()
    expect(fetchAggregatedHomeForCountryMock).not.toHaveBeenCalled()
  })
})
