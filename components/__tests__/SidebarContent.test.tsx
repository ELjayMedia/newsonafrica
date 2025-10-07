import { render, screen, waitFor } from "@testing-library/react"
import { SWRConfig } from "swr"
import { SidebarContent } from "../SidebarContent"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ReactElement } from "react"

const fetchMostReadPosts = vi.fn()
const getCurrentCountry = vi.fn(() => "sz")
const getArticleUrl = vi.fn((slug: string, country?: string) => `/${country || getCurrentCountry()}/article/${slug}`)
const useHomeData = vi.fn()

vi.mock("@/lib/wordpress-api", () => ({
  fetchMostReadPosts: (...args: unknown[]) => fetchMostReadPosts(...args),
}))

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: () => getCurrentCountry(),
  getArticleUrl: (slug: string, country?: string) => getArticleUrl(slug, country),
}))

vi.mock("@/hooks/useHomeData", () => ({
  useHomeData: (...args: unknown[]) => useHomeData(...args),
}))

vi.mock("@/contexts/UserPreferencesContext", () => ({
  useUserPreferences: () => ({
    preferences: {
      sections: [],
    },
  }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={typeof href === "string" ? href : href?.toString?.()} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}))

const renderWithSWR = (ui: ReactElement) =>
  render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {ui}
    </SWRConfig>,
  )

describe("SidebarContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentCountry.mockReturnValue("sz")
    useHomeData.mockReturnValue({
      data: { recentPosts: [] },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })
  })

  it("renders API provided most-read posts", async () => {
    useHomeData.mockReturnValue({
      data: {
        recentPosts: [
          {
            id: "1",
            slug: "breaking-news",
            title: "Breaking News",
            excerpt: "",
            date: "2024-01-01",
            categories: { nodes: [] },
          },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    fetchMostReadPosts.mockResolvedValue([
      {
        id: "most-1",
        slug: "top-story",
        title: "Top Story",
        excerpt: "",
        date: "2024-01-02",
      },
      {
        id: "most-2",
        slug: "second-story",
        title: "Second Story",
        excerpt: "",
        date: "2024-01-03",
      },
    ])

    renderWithSWR(<SidebarContent />)

    await waitFor(() => {
      expect(fetchMostReadPosts).toHaveBeenCalled()
    })

    expect(await screen.findByText("Top Story")).toBeInTheDocument()
    expect(await screen.findByText("Second Story")).toBeInTheDocument()
    expect(screen.getByText("Latest News")).toBeInTheDocument()
  })

  it("requests most-read posts for the current country", async () => {
    getCurrentCountry.mockReturnValue("za")

    useHomeData.mockReturnValue({
      data: {
        recentPosts: [
          {
            id: "2",
            slug: "regional-update",
            title: "Regional Update",
            excerpt: "",
            date: "2024-01-04",
            categories: { nodes: [] },
          },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    })

    fetchMostReadPosts.mockResolvedValue([
      {
        id: "most-za",
        slug: "za-headline",
        title: "ZA Headline",
        excerpt: "",
        date: "2024-01-05",
        country: "za",
      },
    ])

    renderWithSWR(<SidebarContent />)

    await waitFor(() => {
      expect(fetchMostReadPosts).toHaveBeenCalledWith("za", 10)
    })

    expect(await screen.findByText("ZA Headline")).toBeInTheDocument()
  })
})
