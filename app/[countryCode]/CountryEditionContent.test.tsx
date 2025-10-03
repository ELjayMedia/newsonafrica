import { render, screen, waitFor } from "@testing-library/react"
import { SWRConfig } from "swr"
import { describe, it, expect, beforeEach, vi } from "vitest"
import type { CountryConfig } from "@/lib/wordpress-api"

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: () => {}, inView: false }),
}))

vi.mock("@/components/ArticleCard", () => ({
  ArticleCard: ({ article, layout }: any) => (
    <div data-testid={`article-card-${layout}`}>{article.title?.rendered ?? article.title}</div>
  ),
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
      title: post.title?.rendered ?? post.title ?? "",
      excerpt: post.excerpt?.rendered ?? "",
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

import { CountryEditionContent } from "./CountryEditionContent"

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

  it("loads sequential batches using cursors and renders distinct sections", async () => {
    const heroPosts = [createPost(1, "Hero Story"), createPost(2, "Hero Story"), createPost(3, "Hero Story")]
    const trendingPosts = Array.from({ length: 7 }, (_, index) => createPost(index + 1, "Trending Story"))
    const latestPosts = Array.from({ length: 20 }, (_, index) => createPost(index + 1, "Latest Story"))

    wpMocks.getCategoriesForCountry.mockResolvedValue([
      { id: 1, name: "Politics", slug: "politics" },
    ])

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

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 }}>
        <CountryEditionContent countryCode="za" country={country} />
      </SWRConfig>,
    )

    await waitFor(() => expect(wpMocks.getLatestPostsForCountry).toHaveBeenCalledTimes(3))

    expect(screen.getByText("Hero Story 1")).toBeInTheDocument()
    expect(screen.getByText("Trending Story 1")).toBeInTheDocument()
    expect(screen.getByText("Latest Story 1")).toBeInTheDocument()
    expect(screen.getByText("Latest Story 9")).toBeInTheDocument()
    expect(screen.getByText("Politics")).toBeInTheDocument()

    const calls = wpMocks.getLatestPostsForCountry.mock.calls
    expect(calls[0]).toEqual(["za", 3])
    expect(calls[1]).toEqual(["za", 7, "hero-cursor"])
    expect(calls[2]).toEqual(["za", 20, "trending-cursor"])
  })
})
