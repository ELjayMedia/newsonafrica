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
  const fetchMock = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    window.history.pushState({}, "", "/sz")
    window.localStorage.clear()
    document.cookie = "country=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    document.cookie = "preferredCountry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    global.fetch = originalFetch
  })

  const createApiPayload = (
    overrides: Partial<{
      taggedPosts: HomePost[]
      featuredPosts: HomePost[]
      categories: any[]
      recentPosts: HomePost[]
      categoryPosts: Record<string, HomePost[]>
    }> = {},
  ) => ({
    taggedPosts: [createPost("fp-post", "Featured Story")],
    featuredPosts: [createPost("feat-post", "Featured Story")],
    categories: [],
    recentPosts: [createPost("recent-post", "Recent Story")],
    categoryPosts: overrides.categoryPosts ?? {},
    ...overrides,
  })

  // HomeContent is now fully server-driven: category posts arrive through
  // initialData rather than being fetched client-side. Render with the payload
  // wired straight into initialData.
  const renderHomeContent = async (overrides: Partial<ReturnType<typeof createApiPayload>> = {}) => {
    const apiPayload = createApiPayload(overrides)

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 }}>
        <HomeContent
          initialPosts={[createPost("initial-post", "Initial Story")]}
          initialData={{
            taggedPosts: apiPayload.taggedPosts,
            featuredPosts: apiPayload.featuredPosts,
            categories: apiPayload.categories,
            recentPosts: apiPayload.recentPosts,
            categoryPosts: apiPayload.categoryPosts,
          }}
        />
      </SWRConfig>,
    )

    return apiPayload
  }

  it("renders posts for every configured category when data is available", async () => {
    const categoryPosts: Record<string, HomePost[]> = {}

    categoryConfigs.forEach((config) => {
      // The client keys category posts by the resolved slug (typeOverride ?? name).
      const slug = (config.typeOverride ?? config.name).toLowerCase()
      categoryPosts[slug] = [createPost(`${slug}-post`, `${config.name} Story`)]
    })

    await renderHomeContent({ categoryPosts })

    await waitFor(() => expect(screen.queryAllByText("News Story").length).toBeGreaterThan(0))
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)

    categoryConfigs.forEach((config) => {
      expect(screen.getByText(`${config.name} Story`)).toBeInTheDocument()
    })
  })

  it("continues rendering available categories when some responses are empty", async () => {
    const categoryPosts: Record<string, HomePost[]> = {}

    categoryConfigs.forEach((config) => {
      if (config.name === "Business") {
        return
      }

      const slug = (config.typeOverride ?? config.name).toLowerCase()
      categoryPosts[slug] = [createPost(`${slug}-post`, `${config.name} Story`)]
    })

    await renderHomeContent({ categoryPosts })

    await waitFor(() => expect(screen.queryAllByText("News Story").length).toBeGreaterThan(0))
    expect(screen.getAllByText("News Story").length).toBeGreaterThan(0)
    expect(screen.queryByText("Business Story")).not.toBeInTheDocument()
  })
})
