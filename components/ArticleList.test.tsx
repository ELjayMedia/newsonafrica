import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { ArticleList } from "./ArticleList"

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: () => {}, inView: false }),
}))

vi.mock("./ArticleCard", () => ({
  ArticleCard: ({ article, layout }: any) => (
    <div data-testid={`article-card-${layout}`}>{article.title?.rendered ?? article.title}</div>
  ),
}))

describe("ArticleList", () => {
  const createPost = (id: string, title: string) => ({
    id,
    date: new Date().toISOString(),
    slug: id,
    title: { rendered: title },
    excerpt: { rendered: `${title} excerpt` },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requests the next page using the provided cursor", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      posts: [createPost("more-1", "More Story 1")],
      hasNextPage: false,
      endCursor: null,
    })

    render(
      <ArticleList
        fetcher={fetcher}
        initialData={{
          posts: [createPost("init-1", "Initial Story 1")],
          hasNextPage: true,
          endCursor: "cursor-initial",
        }}
      />,
    )

    expect(screen.getByText("Initial Story 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /load more articles/i }))

    await waitFor(() => expect(screen.getByText("More Story 1")).toBeInTheDocument())

    expect(fetcher).toHaveBeenCalledWith("cursor-initial")
  })
})
