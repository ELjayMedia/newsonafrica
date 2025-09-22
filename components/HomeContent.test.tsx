import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { SWRConfig } from "swr"
import { describe, it, expect, afterEach, vi } from "vitest"
import type { ReactNode } from "react"
import { categoryConfigs } from "@/config/homeConfig"

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}))

vi.mock("@/components/FeaturedHero", () => ({
  FeaturedHero: ({ post }: any) => (
    <div data-testid="featured-hero">{post.title?.rendered ?? post.title}</div>
  ),
}))

vi.mock("@/components/SecondaryStories", () => ({
  SecondaryStories: ({ posts }: any) => (
    <div data-testid="secondary-stories">
      {posts.map((post: any) => (
        <span key={post.slug}>{post.title?.rendered ?? post.title}</span>
      ))}
    </div>
  ),
}))

vi.mock("@/components/NewsGrid", () => ({
  NewsGrid: ({ posts }: any) => (
    <div data-testid="news-grid">
      {posts.map((post: any) => (
        <div key={post.slug}>{post.title?.rendered ?? post.title}</div>
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

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: () => "sz",
  getArticleUrl: (slug: string) => `/article/${slug}`,
  getCategoryUrl: (slug: string) => `/category/${slug}`,
}))

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
          title: { rendered: "Latest Story" },
          excerpt: { rendered: "Latest Story excerpt" },
        },
      ],
    })
    wpMocks.mapPostsToHomePosts.mockImplementation((posts: any[]) =>
      posts.map((post) => ({
        id: String(post.id ?? post.slug),
        slug: post.slug,
        date: post.date || new Date().toISOString(),
        title: post.title?.rendered ?? post.title ?? "",
        excerpt: post.excerpt?.rendered ?? post.excerpt ?? "",
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
        />
      </SWRConfig>,
    )

    await waitFor(() => expect(wpMocks.getPostsForCategories).toHaveBeenCalled())
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
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)

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
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)
    expect(screen.queryByText("Business Story")).not.toBeInTheDocument()
  })
})
