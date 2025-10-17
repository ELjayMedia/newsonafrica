import { render, screen, waitFor } from "@testing-library/react"
import { SWRConfig } from "swr"
import { vi, describe, it, expect, beforeEach } from "vitest"
import type { ReactNode } from "react"

const fetchCategoryPostsMock = vi.fn()
const getCurrentCountryMock = vi.fn()

vi.mock("@/lib/wordpress-api", () => ({
  fetchCategoryPosts: fetchCategoryPostsMock,
}))

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: getCurrentCountryMock,
}))

vi.mock("@/components/client/NewsGridClient", () => ({
  NewsGridClient: ({ posts }: { posts: Array<{ id: string; title: string }> }) => (
    <div data-testid="news-grid">{posts.map((post) => post.title).join(", ")}</div>
  ),
}))

vi.mock("./HorizontalCard", () => ({
  HorizontalCard: ({ post }: { post: { id: string; title: string } }) => (
    <div data-testid="horizontal-card">{post.title}</div>
  ),
}))

vi.mock("@/components/ErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("./CategoryPageSkeleton", () => ({
  CategoryPageSkeleton: () => <div data-testid="category-skeleton" />,
}))

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}))

const createPost = (index: number) => ({
  id: `post-${index}`,
  slug: `post-${index}`,
  title: `Country Post ${index}`,
  excerpt: `Excerpt ${index}`,
  date: new Date().toISOString(),
})

describe("CategoryContent", () => {
  beforeEach(() => {
    fetchCategoryPostsMock.mockReset()
    getCurrentCountryMock.mockReset()
  })

  it("passes the current country to fetchCategoryPosts and renders fetched posts", async () => {
    const posts = Array.from({ length: 12 }, (_, index) => createPost(index + 1))

    fetchCategoryPostsMock.mockResolvedValue({
      category: { id: 1, name: "Politics", slug: "politics" },
      posts,
      pageInfo: { hasNextPage: false, endCursor: null },
    })

    getCurrentCountryMock.mockReturnValue("ng")

    const { CategoryContent } = await import("./CategoryContent")

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, errorRetryCount: 0 }}>
        <CategoryContent slug="politics" />
      </SWRConfig>,
    )

    await waitFor(() => expect(fetchCategoryPostsMock).toHaveBeenCalled())

    expect(fetchCategoryPostsMock).toHaveBeenCalledWith("politics", null, "ng")
    expect(screen.getByTestId("news-grid")).toHaveTextContent("Country Post 1")
    expect(screen.getAllByTestId("horizontal-card").length).toBe(2)
  })
})

