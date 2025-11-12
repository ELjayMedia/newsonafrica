import { afterEach, describe, expect, it, vi } from "vitest"

import type { AggregatedHomeData, WordPressPost } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

const BASE_URL = "https://example.com"
const CACHE_TAGS = ["country:all", "section:home", "tag:home-feed"]

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

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockResolvedValue(aggregatedWithContent)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHome(CACHE_TAGS)

    expect(result).toBe(aggregatedWithContent)
    expect(aggregatedSpy).toHaveBeenCalledTimes(1)
  })

  it("returns empty aggregated home data when WordPress fails", async () => {
    vi.resetModules()
    await setupServerMocks()

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockRejectedValue(new Error("wp error"))

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHome(CACHE_TAGS)

    expect(result).toEqual({
      heroPost: null,
      secondaryPosts: [],
      remainingPosts: [],
    })
    expect(aggregatedSpy).toHaveBeenCalledTimes(1)
  })

  it("reuses cached promises for repeated calls", async () => {
    vi.resetModules()
    await setupServerMocks()

    const wordpressApi = await import("@/lib/wordpress-api")
    const aggregatedSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockRejectedValue(new Error("wp error"))

    const homeDataModule = await import("./home-data")

    const [first, second] = await Promise.all([
      homeDataModule.fetchAggregatedHome(CACHE_TAGS),
      homeDataModule.fetchAggregatedHome(CACHE_TAGS),
    ])

    expect(first).toEqual({
      heroPost: null,
      secondaryPosts: [],
      remainingPosts: [],
    })
    expect(second).toEqual({
      heroPost: null,
      secondaryPosts: [],
      remainingPosts: [],
    })
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
    const latestSpy = vi
      .spyOn(wordpressApi, "getLatestPostsForCountry")
      .mockResolvedValue({ posts: [], hasNextPage: false, endCursor: null })
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
        request: expect.objectContaining({
          timeout: expect.any(Number),
          signal: expect.any(Object),
        }),
      }),
    )
    expect(fpTagSpy).toHaveBeenCalledWith(
      "za",
      expect.any(Number),
      expect.objectContaining({
        timeout: 900,
        signal: expect.any(Object),
      }),
    )
    expect(latestSpy).toHaveBeenCalledWith(
      "za",
      expect.any(Number),
      null,
      expect.objectContaining({
        request: expect.objectContaining({
          timeout: 1200,
          signal: expect.any(Object),
        }),
      }),
    )
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
    const latestSpy = vi
      .spyOn(wordpressApi, "getLatestPostsForCountry")
      .mockResolvedValue({ posts: [], hasNextPage: false, endCursor: null })
    const fpTagSpy = vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockResolvedValue(fallbackPosts)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 2)

    expect(frontPageSpy).toHaveBeenCalled()
    expect(fpTagSpy).toHaveBeenCalledWith(
      "za",
      expect.any(Number),
      expect.objectContaining({
        timeout: 900,
        signal: expect.any(Object),
      }),
    )
    expect(latestSpy).toHaveBeenCalledWith(
      "za",
      expect.any(Number),
      null,
      expect.objectContaining({
        request: expect.objectContaining({
          timeout: 1200,
          signal: expect.any(Object),
        }),
      }),
    )
    expect(result.heroPost?.slug).toBe("fallback-one")
    expect(result.secondaryPosts.map((post) => post.slug)).toEqual(["fallback-two"])
    expect(result.remainingPosts).toEqual([])
  })

  it("reuses shared limiter across concurrent home feed requests", async () => {
    vi.resetModules()

    const limiterMetrics = {
      instances: 0,
      maxActive: 0,
      scheduled: 0,
    }

    vi.doMock("p-limit", () => {
      return {
        __esModule: true,
        default: () => {
          limiterMetrics.instances += 1
          const queue: Array<() => void> = []
          let active = 0

          const runNext = () => {
            if (queue.length === 0 || active >= 1) {
              return
            }

            const task = queue.shift()
            if (!task) {
              return
            }

            active += 1
            limiterMetrics.maxActive = Math.max(limiterMetrics.maxActive, active)
            task()
          }

          return function limit<T>(fn: () => Promise<T>): Promise<T> {
            limiterMetrics.scheduled += 1

            return new Promise<T>((resolve, reject) => {
              const execute = async () => {
                try {
                  const result = await fn()
                  resolve(result)
                } catch (error) {
                  reject(error)
                } finally {
                  active -= 1
                  runNext()
                }
              }

              queue.push(() => {
                execute()
              })

              runNext()
            })
          }
        },
      }
    })

    await setupServerMocks()

    const wordpressApi = await import("@/lib/wordpress-api")

    const delay = () => new Promise((resolve) => setTimeout(resolve, 0))

    const hero = {
      id: "hero",
      slug: "lead-story",
      title: "Lead Story",
      excerpt: "Lead Story excerpt",
      date: "2024-05-01T00:00:00Z",
    } as unknown as WordPressPost

    vi.spyOn(wordpressApi, "getFrontPageSlicesForCountry").mockImplementation(async () => {
      await delay()
      return {
        hero: { heroPost: hero, secondaryStories: [] },
        trending: { posts: [], hasNextPage: false, endCursor: null },
        latest: { posts: [], hasNextPage: false, endCursor: null },
      }
    })

    const latestSpy = vi.spyOn(wordpressApi, "getLatestPostsForCountry").mockImplementation(async () => {
      await delay()
      return { posts: [], hasNextPage: false, endCursor: null }
    })

    const fpTagSpy = vi.spyOn(wordpressApi, "getFpTaggedPostsForCountry").mockImplementation(async () => {
      await delay()
      return []
    })

    const homeDataModule = await import("./home-data")

    const [first, second] = await Promise.all([
      homeDataModule.fetchAggregatedHomeForCountry("za", 4),
      homeDataModule.fetchAggregatedHomeForCountry("ng", 4),
    ])

    expect(first.heroPost?.slug).toBe("lead-story")
    expect(second.heroPost?.slug).toBe("lead-story")

    expect(limiterMetrics.instances).toBe(1)
    expect(limiterMetrics.scheduled).toBe(6)
    expect(limiterMetrics.maxActive).toBe(1)

    latestSpy.mock.calls.forEach(([, , , options]) => {
      expect(options?.request?.timeout).toBe(1200)
    })

    fpTagSpy.mock.calls.forEach(([, , options]) => {
      expect(options?.timeout).toBe(900)
    })

    vi.unmock("p-limit")
  })

  it("returns aggregated data when some loaders fail", async () => {
    vi.resetModules()
    await setupServerMocks()

    const wordpressApi = await import("@/lib/wordpress-api")

    vi
      .spyOn(wordpressApi, "getFrontPageSlicesForCountry")
      .mockRejectedValue(new Error("frontpage failed"))

    vi
      .spyOn(wordpressApi, "getLatestPostsForCountry")
      .mockRejectedValue(new Error("recent failed"))

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

    vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockResolvedValue(fallbackPosts)

    const homeDataModule = await import("./home-data")

    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 3)

    expect(result.heroPost?.slug).toBe("fallback-one")
    expect(result.secondaryPosts.map((post) => post.slug)).toEqual(["fallback-two"])
    expect(result.remainingPosts).toEqual([])
  })
})

describe("buildCountryPosts", () => {
  it("limits concurrent fetches while reusing preloaded aggregates", async () => {
    vi.resetModules()
    await setupServerMocks()

    const homeDataModule = await import("./home-data")

    const aggregatedFor = (countryCode: string): AggregatedHomeData => ({
      heroPost: {
        id: `${countryCode}-hero`,
        slug: `${countryCode}-hero`,
        title: `${countryCode}-hero`,
        excerpt: `${countryCode}-hero`,
        date: "2024-01-01T00:00:00.000Z",
        country: countryCode,
      },
      secondaryPosts: [
        {
          id: `${countryCode}-secondary`,
          slug: `${countryCode}-secondary`,
          title: `${countryCode}-secondary`,
          excerpt: `${countryCode}-secondary`,
          date: "2024-01-02T00:00:00.000Z",
          country: countryCode,
        },
      ],
      remainingPosts: [
        {
          id: `${countryCode}-remaining`,
          slug: `${countryCode}-remaining`,
          title: `${countryCode}-remaining`,
          excerpt: `${countryCode}-remaining`,
          date: "2024-01-03T00:00:00.000Z",
          country: countryCode,
        },
      ],
    })

    let inFlight = 0
    let peakInFlight = 0
    const fetchCountryAggregate = vi.fn(async (countryCode: string) => {
      inFlight += 1
      peakInFlight = Math.max(peakInFlight, inFlight)

      await new Promise((resolve) => setTimeout(resolve, 0))

      inFlight -= 1
      return aggregatedFor(countryCode)
    })

    const preloadedCountry = "ng"
    const preloadedAggregate = aggregatedFor(preloadedCountry)
    const countryCodes = ["ng", "za", "ke", "tz", "za", "ng", "eg", "gh"] as const

    const result = (await homeDataModule.buildCountryPosts(
      countryCodes,
      { [preloadedCountry]: preloadedAggregate },
      {
        includeAggregates: true,
        includeAfricanAggregate: true,
        fetchCountryAggregate,
      },
    )) as {
      countryPosts: Record<string, HomePost[]>
      aggregatedByCountry: Record<string, AggregatedHomeData>
      africanAggregate?: AggregatedHomeData
    }

    const expectedCountries = ["ng", "za", "ke", "tz", "eg", "gh"]

    expect(Object.keys(result.countryPosts).sort()).toEqual([...expectedCountries].sort())
    expectedCountries.forEach((countryCode) => {
      const posts = result.countryPosts[countryCode]
      expect(posts).toEqual([
        expect.objectContaining({ slug: `${countryCode}-hero` }),
        expect.objectContaining({ slug: `${countryCode}-secondary` }),
        expect.objectContaining({ slug: `${countryCode}-remaining` }),
      ])
    })

    expect(result.africanAggregate?.heroPost?.slug).toBe("ng-hero")
    expect(result.africanAggregate?.secondaryPosts.length).toBeGreaterThan(0)
    expect(result.aggregatedByCountry).toMatchObject(
      expectedCountries.reduce<Record<string, AggregatedHomeData>>((acc, countryCode) => {
        acc[countryCode] = aggregatedFor(countryCode)
        return acc
      }, {}),
    )

    const uniqueFetchedCountries = new Set(countryCodes.filter((code) => code !== preloadedCountry))
    expect(fetchCountryAggregate).toHaveBeenCalledTimes(uniqueFetchedCountries.size)
    expect(peakInFlight).toBeLessThanOrEqual(homeDataModule.COUNTRY_AGGREGATE_CONCURRENCY)
  })
})

describe("buildHomeContentProps", () => {
  it("flattens aggregated home data into HomeContent props", async () => {
    vi.resetModules()
    await setupServerMocks()

    const { SUPPORTED_COUNTRIES } = await import("@/lib/utils/routing")

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
    const categoriesModule = await import("@/lib/wp-server/categories")
    const categoriesSpy = vi.spyOn(categoriesModule, "getPostsForCategories").mockResolvedValue({})
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
    const latestSpy = vi
      .spyOn(wordpressApi, "getLatestPostsForCountry")
      .mockResolvedValue({ posts: [], hasNextPage: false, endCursor: null })
    const fpSpy = vi.spyOn(wordpressApi, "getFpTaggedPostsForCountry").mockResolvedValue([])

    const homeDataModule = await import("./home-data")

    const result = await homeDataModule.buildHomeContentProps(BASE_URL)

    expect(aggregatedSpy).not.toHaveBeenCalled()
    expect(frontPageSpy).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    expect(fpSpy).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    expect(latestSpy).toHaveBeenCalledTimes(SUPPORTED_COUNTRIES.length)
    expect(categoriesSpy).toHaveBeenCalledTimes(1)

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
