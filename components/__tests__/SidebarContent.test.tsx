import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { SWRConfig } from "swr"
import { SidebarContent } from "../SidebarContent"
import { SidebarErrorState } from "../SidebarErrorState"
import { SidebarEmptyState } from "../SidebarEmptyState"
import { MostReadList } from "../MostReadList"
import { PersonalizedList } from "../PersonalizedList"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ReactElement } from "react"

type FetchResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<FetchResponse>

const fetchMock = vi.fn<FetchMock>()
const getCurrentCountry = vi.fn(() => "sz")
const getArticleUrl = vi.fn((slug: string, country?: string) => `/${country || getCurrentCountry()}/article/${slug}`)
const useUserPreferencesMock = vi.fn(() => ({
  preferences: {
    sections: [],
  },
}))

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: () => getCurrentCountry(),
  getArticleUrl: (slug: string, country?: string) => getArticleUrl(slug, country),
}))

vi.mock("@/contexts/UserPreferencesClient", () => ({
  useUserPreferences: () => useUserPreferencesMock(),
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

const createFetchResponse = (data: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? (init?.ok === false ? 500 : 200),
  json: async () => data,
  text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
})

describe("SidebarContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentCountry.mockReturnValue("sz")
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    useUserPreferencesMock.mockReturnValue({
      preferences: {
        sections: [],
      },
    })
  })

  it("renders API provided most-read posts", async () => {
    fetchMock.mockResolvedValue(
      createFetchResponse({
        recent: [
          {
            id: "1",
            slug: "breaking-news",
            title: "Breaking News",
            excerpt: "",
            date: "2024-01-01",
            categories: { nodes: [] },
          },
        ],
        mostRead: [
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
        ],
      }),
    )

    renderWithSWR(<SidebarContent />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/sidebar?country=sz"),
        expect.objectContaining({
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      )
    })

    expect(await screen.findByText("Top Story")).toBeInTheDocument()
    expect(await screen.findByText("Second Story")).toBeInTheDocument()
    expect(screen.getByText("Latest News")).toBeInTheDocument()
  })

  it("requests sidebar content for the current country", async () => {
    getCurrentCountry.mockReturnValue("za")

    fetchMock.mockResolvedValue(
      createFetchResponse({
        recent: [
          {
            id: "2",
            slug: "regional-update",
            title: "Regional Update",
            excerpt: "",
            date: "2024-01-04",
            categories: { nodes: [] },
          },
        ],
        mostRead: [
          {
            id: "most-za",
            slug: "za-headline",
            title: "ZA Headline",
            excerpt: "",
            date: "2024-01-05",
            country: "za",
          },
        ],
      }),
    )

    renderWithSWR(<SidebarContent />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/sidebar?country=za"),
        expect.any(Object),
      )
    })

    expect(await screen.findByText("ZA Headline")).toBeInTheDocument()
  })

  it("falls back to empty arrays when responses are missing", async () => {
    fetchMock.mockResolvedValue(createFetchResponse({ recent: undefined, mostRead: null }))

    renderWithSWR(<SidebarContent />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/sidebar?country=sz"),
        expect.any(Object),
      )
    })

    expect(await screen.findAllByText("No articles available")).toHaveLength(2)
  })

  it("retries loading data when the user requests it", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(
        createFetchResponse({
          recent: [
            {
              id: "retry-1",
              slug: "breaking-news",
              title: "Recovered Story",
              excerpt: "",
              date: "2024-02-01",
              categories: { nodes: [] },
            },
          ],
          mostRead: [
            {
              id: "retry-most",
              slug: "top-story",
              title: "Recovered Most Read",
              excerpt: "",
              date: "2024-02-02",
            },
          ],
        }),
      )

    renderWithSWR(<SidebarContent />)

    expect(await screen.findByText("Unable to load content")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /try again/i }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    expect(await screen.findByText("Recovered Most Read")).toBeInTheDocument()
    expect(await screen.findByText("Recovered Story")).toBeInTheDocument()
  })
})

describe("Sidebar presentational components", () => {
  it("renders retry action in the error state", () => {
    const onRetry = vi.fn()

    render(<SidebarErrorState onRetry={onRetry} />)

    const button = screen.getByRole("button", { name: /try again/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders empty state messaging", () => {
    render(<SidebarEmptyState />)

    expect(screen.getAllByText("No articles available").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/Check back soon for trending stories/i)[0]).toBeInTheDocument()
  })

  it("renders most read rankings", () => {
    render(
      <MostReadList
        posts={[
          { id: "1", title: "Top Story", href: "/article/top" },
          { id: "2", title: "Second Story", href: "/article/second", date: "2024-01-01" },
        ]}
      />,
    )

    expect(screen.getAllByText("Top Story")[0]).toBeInTheDocument()
    expect(screen.getAllByLabelText("Rank 1")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Updated every 3 minutes")[0]).toBeInTheDocument()
  })

  it("renders personalized list items with media", () => {
    render(
      <PersonalizedList
        title="For You"
        posts={[
          {
            id: "p1",
            title: "Personalized Story",
            href: "/article/personalized",
            date: "2024-03-01",
            imageUrl: "https://example.com/image.jpg",
            imageAlt: "Alt text",
          },
        ]}
      />,
    )

    expect(screen.getByText("Personalized Story")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /alt text/i })).toBeInTheDocument()
  })
})
