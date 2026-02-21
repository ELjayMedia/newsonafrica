import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { CACHE_DURATIONS } from "@/lib/cache/constants"
import type { AggregatedHomeData } from "@/lib/wordpress/service"
import type { HomePost } from "@/types/home"

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

vi.mock("server-only", () => ({}))

const homeContentMock = vi.fn(
  ({ initialData }: { initialData: { taggedPosts: HomePost[] } }) => (
    <div data-testid="home-content">
      <div data-testid="initial-data" data-value={JSON.stringify(initialData)} />
      <nav data-testid="country-navigation" />
    </div>
  ),
)

vi.mock("@/components/HomeContent", () => ({
  HomeContent: homeContentMock,
}))

vi.mock("@/lib/site-url", () => ({
  getSiteBaseUrl: () => "https://example.com",
  SITE_BASE_URL: "https://example.com",
}))

describe("HomePage", () => {
  beforeEach(() => {
    homeContentMock.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("configures incremental static regeneration", async () => {
    const pageModule = await import("./page")

    expect(pageModule.dynamic).toBeUndefined()
    expect(pageModule.revalidate).toBe(CACHE_DURATIONS.MEDIUM)
  })

  it("passes the server-generated fallback into HomeContent", async () => {
    const homeDataModule = await import("./home-data")
    const { SUPPORTED_COUNTRIES } = await import("@/lib/utils/routing")

    const aggregatedHome: AggregatedHomeData = {
      heroPost: {
        id: "hero",
        slug: "hero-story",
        title: "Hero Story",
        excerpt: "Hero",
        date: "2024-01-01T00:00:00.000Z",
      },
      secondaryPosts: [
        {
          id: "secondary",
          slug: "secondary-story",
          title: "Secondary Story",
          excerpt: "Secondary",
          date: "2024-01-02T00:00:00.000Z",
        },
      ],
      remainingPosts: [
        {
          id: "remaining",
          slug: "remaining-story",
          title: "Remaining Story",
          excerpt: "Remaining",
          date: "2024-01-03T00:00:00.000Z",
        },
      ],
    }

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(aggregatedHome), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const countryPosts = SUPPORTED_COUNTRIES.reduce<Record<string, HomePost[]>>((acc, countryCode, index) => {
      const makePost = (suffix: string): HomePost => ({
        id: `${countryCode}-${suffix}`,
        slug: `${countryCode}-${suffix}`,
        title: `${countryCode.toUpperCase()} ${suffix}`,
        excerpt: `${countryCode.toUpperCase()} ${suffix}`,
        date: `2024-02-0${index + 1}T00:00:00.000Z`,
        country: countryCode,
      })

      acc[countryCode] = [makePost("hero"), makePost("secondary"), makePost("remaining")]
      return acc
    }, {})

    const wordpressApi = await import("@/lib/wordpress/service")
    const fpSpy = vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockImplementation(async (countryCode: string) => countryPosts[countryCode] ?? [])

    const expected = await homeDataModule.buildHomeContentProps("https://example.com")

    const { default: Page } = await import("./page")
    const ui = await Page()
    const { getByTestId } = render(ui)

    const expectedFetchCalls = SUPPORTED_COUNTRIES.length * 2 + 1

    expect(fetchMock).toHaveBeenCalledTimes(expectedFetchCalls)
    expect(fpSpy).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    const [props] = homeContentMock.mock.calls.at(-1) ?? []

    expect(props).toMatchObject({
      initialPosts: expected.initialPosts,
      featuredPosts: expected.featuredPosts,
      countryPosts: expected.countryPosts,
      initialData: expected.initialData,
    })
    expect(getByTestId("country-navigation")).toBeInTheDocument()
    expect(JSON.parse(getByTestId("initial-data").getAttribute("data-value") ?? "{}")).toEqual(
      expected.initialData,
    )
  })

  it("generates metadata for the African edition with canonical alternates", async () => {
    const { generateMetadata } = await import("./page")

    const metadata = await generateMetadata()

    expect(metadata.title).toContain("African Edition")
    expect(metadata.description).toContain("African edition")
    expect(metadata.alternates?.canonical).toBe("https://example.com")
    expect(metadata.alternates?.languages).toMatchObject({
      "x-default": "https://example.com",
      "en-SZ": "https://example.com/sz",
    })
    expect(metadata.openGraph?.url).toBe("https://example.com")
    expect(metadata.openGraph?.type).toBe("website")
  })
})
