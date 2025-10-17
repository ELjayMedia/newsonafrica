import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const revalidateTagMock = vi.fn<[string], void>()

const getFpTaggedPostsForCountry = vi.fn(async () => [
  {
    id: "fp-post",
    slug: "fp-post",
    title: "Frontpage post",
    date: "2024-01-01T00:00:00.000Z",
  },
])

const getLatestPostsForCountry = vi.fn(async () => ({
  posts: [
    {
      id: "wp-latest",
      slug: "latest",
      title: "Latest",
      date: "2024-01-02T00:00:00.000Z",
    },
  ],
  hasNextPage: false,
  endCursor: null,
}))

const getCategoriesForCountry = vi.fn(async () => [
  {
    id: 1,
    slug: "news",
    name: "News",
  },
])

const getPostsForCategories = vi.fn(async () => ({}))

const mapPostsToHomePostsMock = vi.fn((posts: any[], country: string) =>
  posts.map((post) => ({ ...post, country })),
)

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}))

vi.mock("@/lib/wordpress-api", () => ({
  DEFAULT_COUNTRY: "za",
  getFpTaggedPostsForCountry,
  getLatestPostsForCountry,
  getCategoriesForCountry,
  getPostsForCategories,
  mapPostsToHomePosts: mapPostsToHomePostsMock,
}))

const createRequest = (path: string) => new NextRequest(path)

describe("GET /api/homepage-data", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("returns uncached responses and revalidates cache tags", async () => {
    mapPostsToHomePostsMock.mockImplementation((posts, country) =>
      posts.map((post) => ({ ...post, country })),
    )

    const { GET } = await import("./route")

    const request = createRequest("https://example.com/api/homepage-data?country=za&categories=business")
    const response = await GET(request)

    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(revalidateTagMock).toHaveBeenCalled()

    const tags = revalidateTagMock.mock.calls.map(([tag]) => tag)
    expect(tags.length).toBeGreaterThan(0)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it("revalidates additional tags discovered during aggregation", async () => {
    mapPostsToHomePostsMock.mockImplementation((posts, country) =>
      posts.map((post) => ({ ...post, country })),
    )

    getPostsForCategories.mockResolvedValueOnce({
      business: {
        category: {
          id: 2,
          slug: "business",
          name: "Business",
        },
        posts: [
          {
            id: "business-post",
            slug: "business-post",
            title: "Business Post",
            date: "2024-01-03T00:00:00.000Z",
          },
        ],
        hasNextPage: false,
        endCursor: null,
      },
      economy: {
        category: {
          id: 3,
          slug: "economy",
          name: "Economy",
        },
        posts: [],
        hasNextPage: false,
        endCursor: null,
      },
    })

    const { GET } = await import("./route")

    const request = createRequest("https://example.com/api/homepage-data?country=za&categories=business")
    revalidateTagMock.mockClear()

    await GET(request)

    const tags = revalidateTagMock.mock.calls.map(([tag]) => tag)
    expect(tags.some((tag) => typeof tag === "string" && tag.includes("category:economy"))).toBe(true)
  })
})
