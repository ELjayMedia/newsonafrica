import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { SWRConfig } from "swr"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { ReactNode } from "react"
import { categoryConfigs } from "@/config/homeConfig"

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}))

vi.mock("@/components/client/FeaturedHeroClient", () => ({
  FeaturedHeroClient: ({ post }: any) => <div data-testid="featured-hero">{post.title}</div>,
}))

vi.mock("@/components/client/SecondaryStoriesClient", () => ({
  SecondaryStoriesClient: ({ posts }: any) => (
    <div data-testid="secondary-stories">
      {posts.map((post: any) => (
        <span key={post.slug}>{post.title}</span>
      ))}
    </div>
  ),
}))

vi.mock("@/components/client/NewsGridClient", () => ({
  NewsGridClient: ({ posts }: any) => (
    <div data-testid="news-grid">
      {posts.map((post: any) => (
        <div key={post.slug}>{post.title}</div>
      ))}
    </div>
  ),
}))

vi.mock("@/components/CountryNavigation", () => ({
  CountryNavigation: () => <nav data-testid="country-navigation" />,
  CountrySpotlight: ({ children }: any) => <section>{children}</section>,
}))

vi.mock("@/components/SchemaOrg", () => ({
  SchemaOrg: () => null,
}))

vi.mock("@/components/ErrorBoundary", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const wpMocks = vi.hoisted(() => ({
  getLatestPostsForCountry: vi.fn(),
  getCategoriesForCountry: vi.fn(),
  getPostsForCategories: vi.fn(),
  getFpTaggedPostsForCountry: vi.fn(),
  mapPostsToHomePosts: vi.fn((posts: any[]) => posts),
}))

vi.mock("@/lib/wordpress-api", () => wpMocks)

vi.mock("@/lib/utils/routing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/routing")>(
    "@/lib/utils/routing",
  )

  return {
    ...actual,
    getCurrentCountry: vi.fn(actual.getCurrentCountry),
    getArticleUrl: vi.fn(actual.getArticleUrl),
    getCategoryUrl: vi.fn(actual.getCategoryUrl),
  }
})

import { HomeContent } from "./HomeContent"

type HomePost = {
  id: string
  slug: string
  date: string
  title: string
  excerpt: string
}

const createPost = (slug: string, title: string): HomePost => ({
  id: Math.floor(Math.random() * 100000).toString(),
  slug,
  date: new Date().toISOString(),
  title,
  excerpt: `${title} excerpt`,
})

describe("HomeContent", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sz")
    window.localStorage.clear()
    document.cookie = "preferredCountry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderHomeContent = async () => {
    wpMocks.getFpTaggedPostsForCountry.mockResolvedValue([
      createPost("fp-post", "Featured Story"),
    ])
    wpMocks.getLatestPostsForCountry.mockResolvedValue({
      posts: [
        {
          id: 1,
          slug: "latest-story",
          date: new Date().toISOString(),
          title: "Latest Story",
          excerpt: "Latest Story excerpt",
        },
      ],
    })
    wpMocks.mapPostsToHomePosts.mockImplementation((posts: any[]) =>
      posts.map((post) => ({
        id: String(post.id ?? post.slug),
        slug: post.slug,
        date: post.date || new Date().toISOString(),
        title: post.title ?? "",
        excerpt: post.excerpt ?? "",
      })),
    )
    wpMocks.getCategoriesForCountry.mockResolvedValue({ categories: [] })

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 }}>
        <HomeContent
          initialPosts={[createPost("initial-post", "Initial Story")]}
          initialData={{
            taggedPosts: [createPost("fp-post", "Featured Story")],
            featuredPosts: [createPost("feat-post", "Featured Story")],
            categories: [],
            recentPosts: [createPost("recent-post", "Recent Story")],
          }}
          editionCode="sz"
        />
      </SWRConfig>,
    )

    await waitFor(() => expect(wpMocks.getPostsForCategories).toHaveBeenCalled())
    expect(wpMocks.getPostsForCategories.mock.calls[0]?.[0]).toBe("sz")
  }

  it("renders posts for every configured category when data is available", async () => {
    const batchedResponse: Record<string, any> = {}

    categoryConfigs.forEach((config, index) => {
      const slug = config.name.toLowerCase()
      batchedResponse[slug] = {
        category: { id: index + 1, name: config.name, slug },
        posts: [createPost(`${slug}-post`, `${config.name} Story`)],
        hasNextPage: false,
        endCursor: null,
      }
    })

    wpMocks.getPostsForCategories.mockResolvedValue(batchedResponse)

    await renderHomeContent()

    await waitFor(() =>
      expect(screen.queryAllByText("News Story").length).toBeGreaterThan(0),
    )
    expect(wpMocks.getPostsForCategories.mock.calls[0]?.[0]).toBe("sz")
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)
    expect(screen.queryByTestId("country-navigation")).not.toBeInTheDocument()

    categoryConfigs.forEach((config) => {
      expect(screen.getByText(`${config.name} Story`)).toBeInTheDocument()
    })
  })

  it("continues rendering available categories when some responses are empty", async () => {
    const batchedResponse: Record<string, any> = {}

    categoryConfigs.forEach((config, index) => {
      if (config.name === "Business") {
        return
      }

      const slug = config.name.toLowerCase()
      batchedResponse[slug] = {
        category: { id: index + 1, name: config.name, slug },
        posts: [createPost(`${slug}-post`, `${config.name} Story`)],
        hasNextPage: false,
        endCursor: null,
      }
    })

    wpMocks.getPostsForCategories.mockResolvedValue(batchedResponse)

    await renderHomeContent()

    await waitFor(() =>
      expect(screen.queryAllByText("News Story").length).toBeGreaterThan(0),
    )
    expect(wpMocks.getPostsForCategories.mock.calls[0]?.[0]).toBe("sz")
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)
    expect(screen.queryByTestId("country-navigation")).not.toBeInTheDocument()
    expect(screen.queryByText("Business Story")).not.toBeInTheDocument()
  })
})
