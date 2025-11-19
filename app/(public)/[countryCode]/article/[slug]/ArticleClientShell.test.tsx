import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"

const mockBookmarkButton = vi.fn(() => null)
const mockShareButtons = vi.fn(() => null)
const mockArticleList = vi.fn(() => null)
const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority: _priority, fill: _fill, ...props }: Record<string, any>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

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
  CommentList: ({ postId, editionCode }: { postId: string; editionCode: string }) => (
    <h2>
      Comments for {editionCode}:{postId}
    </h2>
  ),
}))

import { ArticleClientShell } from "./ArticleClientShell"

describe("ArticleClientShell", () => {
  type ArticleFetcher = (input: { countryCode: string; slug: string }) => Promise<{
    article: any
    sourceCountry: string
    relatedPosts: any[]
  }>

  const baseInitialData = {
    categories: { nodes: [] },
    date: new Date().toISOString(),
    title: "Test Title",
    author: { node: { name: "Author Name" } },
    content: "<p>Content</p>",
    featuredImage: {
      node: {
        sourceUrl: "https://example.com/image.jpg",
        altText: "Alt text",
        mediaDetails: { width: 1200, height: 800 },
      },
    },
    excerpt: "An excerpt",
    slug: "test-slug",
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

  it("does not fetch new data on mount when initial data matches the requested article", async () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 321 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 111 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(fetcherMock).not.toHaveBeenCalled()
  })

  it("fetches the latest article when navigating to a different slug after hydration", async () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 321, slug: "next-slug", title: "Next Title" },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    const { rerender } = render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 111 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(fetcherMock).not.toHaveBeenCalled()

    rerender(
      <ArticleClientShell
        slug="next-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 222, slug: "next-slug", title: "Next Title" }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalledWith({ countryCode: "ng", slug: "next-slug" })
    })
  })

  it("renders related posts when provided", () => {
    const relatedPosts = [{ id: "1", title: "Related" } as any]
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 123 },
      sourceCountry: "ng",
      relatedPosts,
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={relatedPosts}
        fetchArticleWithFallback={fetcherMock}
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
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 123 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    expect(screen.getByText("No related articles found.")).toBeInTheDocument()
  })

  it("highlights reading time and key takeaways in the redesigned sidebar", () => {
    const longContent = `<p>${Array.from({ length: 400 })
      .map(() => "word")
      .join(" ")}</p>`
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 222 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{
          ...baseInitialData,
          id: 222,
          content: longContent,
          excerpt: "First point. Second insight! Third detail?",
        }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    expect(screen.getByText(/min read/i)).toBeInTheDocument()
    expect(screen.getByText(/key takeaways/i)).toBeInTheDocument()
    expect(screen.getByText("First point")).toBeInTheDocument()
    expect(screen.getByText("Second insight")).toBeInTheDocument()
  })

  it("navigates to the subscription flow from the sidebar CTA", () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 333 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 333 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    const subscribeButton = screen.getByRole("button", { name: /see subscription options/i })
    fireEvent.click(subscribeButton)

    expect(pushMock).toHaveBeenCalledWith("/subscribe?country=ng")
  })

  it("renders the gift article button alongside share and bookmark controls", () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 123 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    const giftButton = screen.getByRole("button", { name: /gift article/i })
    const shareButton = screen.getByTestId("share-buttons")
    const bookmark = screen.getByTestId("bookmark-button")

    expect(shareButton.parentElement).toBe(giftButton.parentElement)
    expect(bookmark.parentElement).toBe(giftButton.parentElement)

    fireEvent.click(giftButton)

    expect(pushMock).toHaveBeenCalledWith("/subscribe?intent=gift&article=test-slug&country=ng")
    const shareProps = mockShareButtons.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(shareProps).toMatchObject({
      url: "/ng/article/test-slug",
      title: "Test Title",
      description: "An excerpt",
    })
  })

  it("sanitizes share metadata before passing it to the share buttons", () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 789 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{
          ...baseInitialData,
          id: 789,
          title: "Breaking &amp; <em>News</em>",
          excerpt: "<strong>Summary &amp; details</strong>",
        }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    const shareProps = mockShareButtons.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(shareProps).toMatchObject({
      title: "Breaking & News",
      description: "Summary & details",
    })
  })

  it("renders the comments heading when a post id is provided", () => {
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: { ...baseInitialData, id: 456 },
      sourceCountry: "ng",
      relatedPosts: [],
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 456 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
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

    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: initialData,
      sourceCountry: "ng",
      relatedPosts: [],
    })

    const { container } = render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
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

  it("fetches updated article data when the refresh button is clicked", async () => {
    const updatedArticle = {
      ...baseInitialData,
      id: 999,
      title: "Updated Title",
      content: "<p>Updated content</p>",
    }
    const updatedRelatedPosts = [{ id: "2", title: "Updated Related" }]
    const fetcherMock = vi.fn<ArticleFetcher>().mockResolvedValue({
      article: updatedArticle,
      sourceCountry: "za",
      relatedPosts: updatedRelatedPosts,
    })

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[{ id: "1", title: "Original" }] as any}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    const refreshButton = screen.getByRole("button", { name: /refresh article content/i })
    fireEvent.click(refreshButton)

    await screen.findByRole("heading", { name: "Updated Title" })
    expect(fetcherMock).toHaveBeenCalledWith({ countryCode: "ng", slug: "test-slug" })

    const lastArticleListCall = mockArticleList.mock.calls.at(-1)?.[0] as Record<string, any>
    expect(lastArticleListCall?.articles).toEqual(updatedRelatedPosts)

    const goToCountryButton = screen.getByRole("button", { name: /go to country page/i })
    fireEvent.click(goToCountryButton)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/za")
    })
  })

  it("displays an error message when the refresh action fails", async () => {
    const fetcherMock = vi
      .fn<ArticleFetcher>()
      .mockRejectedValue(new Error("Network error"))

    render(
      <ArticleClientShell
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
        relatedPosts={[]}
        fetchArticleWithFallback={fetcherMock}
      />,
    )

    const refreshButton = screen.getByRole("button", { name: /refresh article content/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(refreshButton).toBeDisabled()
    })

    await screen.findByText("We couldn't refresh the article: Network error")

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled()
    })
  })
})
