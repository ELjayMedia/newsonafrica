import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"

const mockBookmarkButton = vi.fn(() => null)
const mockShareButtons = vi.fn(() => null)
const mockArticleList = vi.fn(() => null)
const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock("@/components/BookmarkButton", () => ({
  BookmarkButton: (props: Record<string, unknown>) => {
    mockBookmarkButton(props)
    return <div data-testid="bookmark-button" />
  },
}))

vi.mock("@/components/ShareButtons", () => ({
  ShareButtons: (props: Record<string, unknown>) => {
    mockShareButtons(props)
    return (
      <button type="button" data-testid="share-buttons">
        Share
      </button>
    )
  },
}))

vi.mock("@/components/ArticleList", () => ({
  ArticleList: (props: Record<string, unknown>) => {
    mockArticleList(props)
    return <div data-testid="article-list" />
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: backMock,
    push: pushMock,
  }),
}))

vi.mock("@/components/CommentList", () => ({
  CommentList: ({ postId }: { postId: string }) => <h2>Comments for {postId}</h2>,
}))

import { ArticleClientShell } from "./ArticleClientShell"

describe("ArticleClientShell", () => {
  const baseInitialData = {
    categories: { nodes: [] },
    date: new Date().toISOString(),
    title: "Test Title",
    author: { node: { name: "Author Name" } },
    content: "<p>Content</p>",
    featuredImage: { node: { sourceUrl: "https://example.com/image.jpg", altText: "Alt text" } },
    excerpt: "An excerpt",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockBookmarkButton.mockClear()
    mockShareButtons.mockClear()
    mockArticleList.mockClear()
    pushMock.mockClear()
    backMock.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders related posts when provided", () => {
    const relatedPosts = [{ id: "1", title: "Related" } as any]

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={relatedPosts}
      />, 
    )

    expect(mockArticleList).toHaveBeenCalledWith(
      expect.objectContaining({
        articles: relatedPosts,
        layout: "compact",
        showLoadMore: false,
      }),
    )
    expect(screen.queryByText("No related articles found.")).not.toBeInTheDocument()
  })

  it("renders fallback message when no related posts are available", () => {
    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[]}
      />, 
    )

    expect(screen.getByText("No related articles found.")).toBeInTheDocument()
  })

  it("renders the gift article button alongside share and bookmark controls", () => {
    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[]}
      />, 
    )

    const giftButton = screen.getByRole("button", { name: /gift article/i })
    const shareButton = screen.getByTestId("share-buttons")
    const bookmark = screen.getByTestId("bookmark-button")

    expect(shareButton.parentElement).toBe(giftButton.parentElement)
    expect(bookmark.parentElement).toBe(giftButton.parentElement)

    fireEvent.click(giftButton)

    expect(pushMock).toHaveBeenCalledWith("/subscribe?intent=gift&article=test-slug&country=ng")
    expect(mockShareButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/ng/article/test-slug",
        title: "Test Title",
      }),
    )
  })

  it("renders the comments heading when a post id is provided", () => {
    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 456 }}
        relatedPosts={[]}
      />, 
    )

    expect(screen.getByRole("heading", { name: /comments/i })).toBeInTheDocument()
  })

  it("sanitizes and transforms article content", () => {
    const initialData = {
      ...baseInitialData,
      id: 123,
      content:
        '<p>Safe</p><script>alert("xss")</script><div onclick="alert(1)">Click</div>' +
        '<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=dQw4w9WgXcQ</div></figure>',
    }

    const { container } = render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
        relatedPosts={[]}
      />, 
    )

    expect(container.querySelector("script")).toBeNull()
    const articleContent = container.querySelector("#article-content")
    expect(articleContent?.innerHTML).not.toContain("onclick")
    expect(articleContent?.textContent).toContain("Safe")
    const iframe = container.querySelector("iframe")
    expect(iframe).not.toBeNull()
    expect(iframe).toHaveAttribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ")
  })
})
