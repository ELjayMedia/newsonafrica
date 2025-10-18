import { afterEach, describe, expect, it, vi } from "vitest"

import type { AggregatedHomeData, WordPressPost } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

const BASE_URL = "https://example.com"
const CACHE_TAGS = ["section:home-feed"]

const setupServerMocks = async () => {
  vi.doMock("server-only", () => ({}))
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react")

    return {
      ...actual,
      cache: ((fn: (...args: unknown[]) => unknown) => {
        const store = new Map<string, unknown>()

        return ((...args: unknown[]) => {
          const key = JSON.stringify(args)

          if (!store.has(key)) {
            store.set(key, fn(...args))
          }

          return store.get(key)
        }) as typeof fn
      }) as typeof actual.cache,
    }
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("fetchAggregatedHome", () => {
  const aggregatedWithContent: AggregatedHomeData = {
    heroPost: {
      id: "hero",
      slug: "lead-story",
      title: "Lead Story",
      excerpt: "Lead",
      date: "2024-01-01T00:00:00.000Z",
    },
    secondaryPosts: [
      {
        id: "secondary-1",
        slug: "secondary-one",
        title: "Secondary One",
        excerpt: "Secondary One",
        date: "2024-01-02T00:00:00.000Z",
      },
    ],
    remainingPosts: [
      {
        id: "remaining-1",
        slug: "more-one",
        title: "More One",
        excerpt: "More One",
        date: "2024-01-03T00:00:00.000Z",
      },
    ],
  }

  it("returns aggregated WordPress content when it is available", async () => {
    vi.resetModules()
    await setupServerMocks()

    const fetchMock = vi.fn(() => {
      throw new Error("API route should not be called when WordPress succeeds")
    })
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockResolvedValue(aggregatedWithContent)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS)

    expect(result).toBe(aggregatedWithContent)
    expect(aggregatedSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to the API route when the WordPress aggregation fails", async () => {
    vi.resetModules()
    await setupServerMocks()

    const apiPayload: AggregatedHomeData = {
      heroPost: {
        id: "api-hero",
        slug: "api-lead",
        title: "API Lead",
        excerpt: "API Lead",
        date: "2024-02-01T00:00:00.000Z",
      },
      secondaryPosts: [],
      remainingPosts: [],
    }

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(apiPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockRejectedValue(new Error("wp error"))

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS)

    expect(result).toEqual(apiPayload)
    expect(aggregatedSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("deduplicates fallback API requests when the WordPress aggregation fails", async () => {
    vi.resetModules()
    await setupServerMocks()

    const apiPayload: AggregatedHomeData = {
      heroPost: {
        id: "api-hero",
        slug: "api-lead",
        title: "API Lead",
        excerpt: "API Lead",
        date: "2024-02-01T00:00:00.000Z",
      },
      secondaryPosts: [],
      remainingPosts: [],
    }

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(apiPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockRejectedValue(new Error("wp error"))

    const homeDataModule = await import("./home-data")

    const [first, second] = await Promise.all([
      homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS),
      homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS),
    ])

    expect(first).toEqual(apiPayload)
    expect(second).toEqual(apiPayload)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(aggregatedSpy).toHaveBeenCalledTimes(1)
  })
})

describe("fetchAggregatedHomeForCountry", () => {
  it("builds aggregated home data from frontpage slices when available", async () => {
    vi.resetModules()
    await setupServerMocks()

    const wordpressApi = await import("@/lib/wordpress-api")
    const hero = {
      id: "hero",
      slug: "lead-story",
      title: "Lead Story",
      excerpt: "Lead Story excerpt",
      date: "2024-05-01T00:00:00Z",
    } as unknown as WordPressPost
    const secondary = {
      id: "secondary",
      slug: "secondary-story",
      title: "Secondary",
      excerpt: "Secondary excerpt",
      date: "2024-04-30T00:00:00Z",
    } as unknown as WordPressPost
    const trending = [
      {
        id: "trend-1",
        slug: "trend-one",
        title: "Trend one",
        excerpt: "Trend one excerpt",
        date: "2024-04-29T00:00:00Z",
      } as unknown as WordPressPost,
      {
        id: "trend-2",
        slug: "trend-two",
        title: "Trend two",
        excerpt: "Trend two excerpt",
        date: "2024-04-28T00:00:00Z",
      } as unknown as WordPressPost,
    ]
    const latest = [
      {
        id: "latest-1",
        slug: "latest-one",
        title: "Latest one",
        excerpt: "Latest one excerpt",
        date: "2024-04-27T00:00:00Z",
      } as unknown as WordPressPost,
    ]

    const frontPageSpy = vi.spyOn(wordpressApi, "getFrontPageSlicesForCountry").mockResolvedValue({
      hero: { heroPost: hero, secondaryStories: [secondary] },
      trending: { posts: trending, hasNextPage: false, endCursor: null },
      latest: { posts: latest, hasNextPage: false, endCursor: null },
    })
    const fpTagSpy = vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockResolvedValue([])

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 4)

    expect(frontPageSpy).toHaveBeenCalledWith(
      "za",
      expect.objectContaining({
        trendingLimit: expect.any(Number),
        latestLimit: expect.any(Number),
      }),
    )
    expect(fpTagSpy).not.toHaveBeenCalled()
    expect(result.heroPost?.slug).toBe("lead-story")
    expect(result.secondaryPosts.map((post) => post.slug)).toEqual([
      "secondary-story",
      "trend-one",
      "trend-two",
    ])
    expect(result.remainingPosts.map((post) => post.slug)).toEqual(["latest-one"])
  })

  it("falls back to fp-tag posts when frontpage slices are empty", async () => {
    vi.resetModules()
    await setupServerMocks()

    const fallbackPosts: HomePost[] = [
      {
        id: "fallback-1",
        slug: "fallback-one",
        title: "Fallback one",
        excerpt: "Fallback one excerpt",
        date: "2024-05-01T00:00:00Z",
      },
      {
        id: "fallback-2",
        slug: "fallback-two",
        title: "Fallback two",
        excerpt: "Fallback two excerpt",
        date: "2024-05-02T00:00:00Z",
      },
    ]

    const wordpressApi = await import("@/lib/wordpress-api")
    const frontPageSpy = vi.spyOn(wordpressApi, "getFrontPageSlicesForCountry").mockResolvedValue({
      hero: { heroPost: undefined, secondaryStories: [] },
      trending: { posts: [], hasNextPage: false, endCursor: null },
      latest: { posts: [], hasNextPage: false, endCursor: null },
    })
    const fpTagSpy = vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockResolvedValue(fallbackPosts)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 2)

    expect(frontPageSpy).toHaveBeenCalled()
    expect(fpTagSpy).toHaveBeenCalledWith("za", expect.any(Number))
    expect(result.heroPost?.slug).toBe("fallback-one")
    expect(result.secondaryPosts.map((post) => post.slug)).toEqual(["fallback-two"])
    expect(result.remainingPosts).toEqual([])
  })
})

describe("buildHomeContentProps", () => {
  it("flattens aggregated home data into HomeContent props", async () => {
    vi.resetModules()
    await setupServerMocks()

    const { SUPPORTED_COUNTRIES } = await import("@/lib/utils/routing")

    const fetchMock = vi.fn(() => {
      throw new Error("API route should not be called when WordPress succeeds")
    })
    vi.stubGlobal("fetch", fetchMock)

    const countryPosts = SUPPORTED_COUNTRIES.reduce<Record<string, HomePost[]>>((acc, countryCode, index) => {
      const basePost = (suffix: string): HomePost => ({
        id: `${countryCode}-${suffix}`,
        slug: `${countryCode}-${suffix}`,
        title: `${countryCode.toUpperCase()} ${suffix}`,
        excerpt: `${countryCode.toUpperCase()} ${suffix}`,
        date: `2024-02-0${index + 1}T00:00:00.000Z`,
        country: countryCode,
      })

      acc[countryCode] = [basePost("hero"), basePost("secondary"), basePost("remaining")]
      return acc
    }, {})

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi.spyOn(wordpressApi, "getAggregatedLatestHome")
    const toWordPress = (post: HomePost): WordPressPost =>
      ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        date: post.date,
      } as unknown as WordPressPost)

    const frontPageSlicesByCountry = SUPPORTED_COUNTRIES.reduce<
      Record<string, Awaited<ReturnType<typeof wordpressApi.getFrontPageSlicesForCountry>>>
    >((acc, countryCode) => {
      const posts = countryPosts[countryCode] ?? []
      const wpPosts = posts.map(toWordPress)

      acc[countryCode] = {
        hero: {
          heroPost: wpPosts[0],
          secondaryStories: wpPosts.slice(1, 4),
        },
        trending: {
          posts: wpPosts.slice(4, 7),
          hasNextPage: false,
          endCursor: null,
        },
        latest: {
          posts: wpPosts.slice(7),
          hasNextPage: false,
          endCursor: null,
        },
      }

      return acc
    }, {})

    const frontPageSpy = vi
      .spyOn(wordpressApi, "getFrontPageSlicesForCountry")
      .mockImplementation(async (countryCode: string) => frontPageSlicesByCountry[countryCode])
    const fpSpy = vi.spyOn(wordpressApi, "getFpTaggedPostsForCountry")

    const homeDataModule = await import("./home-data")

    const result = await homeDataModule.buildHomeContentProps(BASE_URL)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(aggregatedSpy).not.toHaveBeenCalled()
    expect(frontPageSpy).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    expect(fpSpy).not.toHaveBeenCalled()

    const expectedInitialPosts = SUPPORTED_COUNTRIES.flatMap(
      (countryCode) => countryPosts[countryCode] ?? [],
    )

    expect(result.initialPosts).toEqual(expectedInitialPosts)

    expect(result.featuredPosts).toEqual(result.initialPosts.slice(0, 6))
    expect(result.initialData.taggedPosts).toEqual(result.initialPosts.slice(0, 8))
    expect(result.initialData.recentPosts).toEqual(result.initialPosts.slice(0, 10))
    expect(result.initialData.categories).toEqual([])
    expect(result.initialData.featuredPosts).toEqual(result.featuredPosts)

    SUPPORTED_COUNTRIES.forEach((countryCode) => {
      expect(result.countryPosts[countryCode]).toEqual(countryPosts[countryCode])
      expect(
        frontPageSpy.mock.calls.filter(([code]) => code === countryCode).length,
      ).toBe(1)
    })
    expect(Object.keys(result.countryPosts).sort()).toEqual([...SUPPORTED_COUNTRIES].sort())
  })
})
