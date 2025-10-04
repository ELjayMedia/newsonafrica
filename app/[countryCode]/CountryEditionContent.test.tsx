import { describe, it, expect, beforeEach, vi } from "vitest"
import type { CountryConfig } from "@/lib/wordpress-api"
import { CountryEditionContent, __TESTING__ } from "./CountryEditionContent"

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}))

const wpMocks = vi.hoisted(() => ({
  getLatestPostsForCountry: vi.fn(),
  getCategoriesForCountry: vi.fn(),
  getPostsForCategories: vi.fn().mockResolvedValue({}),
  getFpTaggedPostsForCountry: vi.fn().mockResolvedValue([]),
  mapPostsToHomePosts: vi.fn((posts: any[], countryCode: string) =>
    posts.map((post) => ({
      id: String(post.id ?? post.slug ?? ""),
      slug: post.slug ?? "",
      title: post.title ?? "",
      excerpt: post.excerpt ?? "",
      date: post.date ?? "",
      country: countryCode,
      featuredImage: undefined,
    })),
  ),
  COUNTRIES: {
    za: { code: "za", name: "South Africa", flag: "🇿🇦", apiEndpoint: "", restEndpoint: "" },
  },
}))

vi.mock("@/lib/wordpress-api", () => wpMocks)

const { fetchHeroSectionData, fetchTrendingSectionData, fetchLatestSectionData, fetchCategoriesData } = __TESTING__

const createPost = (id: number, prefix: string) => ({
  id,
  date: new Date().toISOString(),
  slug: `${prefix}-${id}`,
  title: `${prefix} ${id}`,
  excerpt: `${prefix} ${id} excerpt`,
})

describe("CountryEditionContent", () => {
  const country: CountryConfig = {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    apiEndpoint: "https://example.com/graphql",
    restEndpoint: "https://example.com/rest",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads sequential batches using cursors and returns section data", async () => {
    const heroPosts = [createPost(1, "Hero Story"), createPost(2, "Hero Story"), createPost(3, "Hero Story")]
    const trendingPosts = Array.from({ length: 7 }, (_, index) => createPost(index + 1, "Trending Story"))
    const latestPosts = Array.from({ length: 20 }, (_, index) => createPost(index + 1, "Latest Story"))

    wpMocks.getCategoriesForCountry.mockResolvedValue([
      { id: 1, name: "Politics", slug: "politics" },
    ])

    wpMocks.getPostsForCategories.mockResolvedValue({
      news: {
        category: { id: 2, name: "News", slug: "news" },
        posts: [createPost(99, "News Story")],
        hasNextPage: false,
        endCursor: null,
      },
    })

    wpMocks.getLatestPostsForCountry.mockImplementation((code: string, limit: number, cursor?: string | null) => {
      if (limit === 3) {
        return Promise.resolve({ posts: heroPosts, hasNextPage: true, endCursor: "hero-cursor" })
      }

      if (limit === 7) {
        if (cursor !== "hero-cursor") {
          throw new Error(`Expected hero cursor, received ${cursor}`)
        }
        return Promise.resolve({ posts: trendingPosts, hasNextPage: true, endCursor: "trending-cursor" })
      }

      if (limit === 20) {
        if (cursor !== "trending-cursor") {
          throw new Error(`Expected trending cursor, received ${cursor}`)
        }
        return Promise.resolve({ posts: latestPosts, hasNextPage: true, endCursor: "latest-cursor" })
      }

      throw new Error(`Unexpected call: limit=${limit}, cursor=${cursor}`)
    })

    const heroData = await fetchHeroSectionData(country.code)
    const trendingData = await fetchTrendingSectionData(country.code, heroData.heroLatestEndCursor)
    const latestData = await fetchLatestSectionData(country.code, trendingData.endCursor)
    const categoriesData = await fetchCategoriesData(country.code)

    expect(heroData.heroPost?.title).toBe("Hero Story 1")
    expect(trendingData.posts[0].title).toBe("Trending Story 1")
    expect(latestData.posts[8].title).toBe("Latest Story 9")
    expect(categoriesData.categories.map((category) => category.name)).toContain("Politics")
    expect(Object.keys(categoriesData.categoryPosts)).toContain("news")

    const calls = wpMocks.getLatestPostsForCountry.mock.calls
    expect(calls[0]).toEqual(["za", 3])
    expect(calls[1]).toEqual(["za", 7, "hero-cursor"])
    expect(calls[2]).toEqual(["za", 20, "trending-cursor"])
  })

  it("renders without throwing when invoked as a server component", async () => {
    await expect(CountryEditionContent({ countryCode: country.code, country })).resolves.toBeTruthy()
  })
})
