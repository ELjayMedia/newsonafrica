import { describe, it, expect, beforeEach, vi } from "vitest"
import type { CountryConfig } from "@/lib/wordpress-api"
import { CountryEditionContent, __TESTING__ } from "./CountryEditionContent"

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}))

const wpMocks = vi.hoisted(() => ({
  getFrontPageSlicesForCountry: vi.fn(),
  getLatestPostsForCountry: vi.fn(),
  getCategoriesForCountry: vi.fn(),
  getPostsForCategories: vi.fn().mockResolvedValue({}),
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
    za: {
      code: "za",
      name: "South Africa",
      flag: "🇿🇦",
      apiEndpoint: "",
      restEndpoint: "",
      canonicalUrl: "https://example.com/za",
      hreflang: "en-ZA",
    },
  },
}))

vi.mock("@/lib/wordpress-api", () => wpMocks)

const {
  fetchFrontPageSlices,
  fetchHeroSectionData,
  fetchTrendingSectionData,
  fetchLatestSectionData,
  fetchCategoriesData,
} = __TESTING__

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
    canonicalUrl: "https://example.com/za",
    hreflang: "en-ZA",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    wpMocks.getFrontPageSlicesForCountry.mockResolvedValue({
      hero: { heroPost: undefined, secondaryStories: [] },
      trending: { posts: [], hasNextPage: false, endCursor: null },
      latest: { posts: [], hasNextPage: false, endCursor: null },
    })
    wpMocks.getLatestPostsForCountry.mockResolvedValue({
      posts: [],
      hasNextPage: false,
      endCursor: null,
    })
  })

  it("loads aggregated frontpage slices and returns section data", async () => {
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

    wpMocks.getFrontPageSlicesForCountry.mockResolvedValue({
      hero: { heroPost: heroPosts[0], secondaryStories: heroPosts.slice(1) },
      trending: { posts: trendingPosts, hasNextPage: true, endCursor: "trending-cursor" },
      latest: { posts: latestPosts, hasNextPage: true, endCursor: "latest-cursor" },
    })

    const frontPagePromise = fetchFrontPageSlices(country.code)
    const heroData = await fetchHeroSectionData(frontPagePromise)
    const trendingData = await fetchTrendingSectionData(frontPagePromise)
    const latestData = await fetchLatestSectionData(frontPagePromise)
    const categoriesData = await fetchCategoriesData(country.code)

    expect(heroData.heroPost?.title).toBe("Hero Story 1")
    expect(trendingData.posts[0].title).toBe("Trending Story 1")
    expect(latestData.posts[8].title).toBe("Latest Story 9")
    expect(categoriesData.categories.map((category) => category.name)).toContain("Politics")
    expect(Object.keys(categoriesData.categoryPosts)).toContain("news")

    expect(wpMocks.getFrontPageSlicesForCountry).toHaveBeenCalledTimes(1)
  })

  it("renders without throwing when invoked as a server component", async () => {
    wpMocks.getFrontPageSlicesForCountry.mockResolvedValue({
      hero: { heroPost: createPost(1, "Hero"), secondaryStories: [createPost(2, "Hero")] },
      trending: { posts: [createPost(1, "Trending")], hasNextPage: false, endCursor: null },
      latest: { posts: [createPost(1, "Latest")], hasNextPage: false, endCursor: null },
    })
    await expect(CountryEditionContent({ countryCode: country.code, country })).resolves.toBeTruthy()
  })
})
