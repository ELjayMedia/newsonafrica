import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const bookmarkMocks = vi.hoisted(() => {
  let bookmarked = false

  const isBookmarkedMock = vi.fn(() => bookmarked)
  const addBookmarkMock = vi.fn(async () => {
    bookmarked = true
  })
  const removeBookmarkMock = vi.fn(async () => {
    bookmarked = false
  })

  return {
    get isBookmarkedMock() {
      return isBookmarkedMock
    },
    get addBookmarkMock() {
      return addBookmarkMock
    },
    get removeBookmarkMock() {
      return removeBookmarkMock
    },
    reset() {
      bookmarked = false
      isBookmarkedMock.mockClear()
      addBookmarkMock.mockClear()
      removeBookmarkMock.mockClear()
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock("@/lib/wordpress-api", () => ({
  getRelatedPostsForCountry: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "user-1" },
  }),
}))

vi.mock("@/contexts/BookmarksContext", () => ({
  useBookmarks: () => ({
    isBookmarked: bookmarkMocks.isBookmarkedMock,
    addBookmark: bookmarkMocks.addBookmarkMock,
    removeBookmark: bookmarkMocks.removeBookmarkMock,
    isLoading: false,
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

import { ArticleClientContent } from "./ArticleClientContent"
import { getRelatedPostsForCountry } from "@/lib/wordpress-api"

const baseInitialData = {
  categories: { nodes: [] },
  date: new Date().toISOString(),
  title: "Test Title",
  author: { node: { name: "Author Name" } },
  content: "<p>Content</p>",
  excerpt: "Summary",
  featuredImage: { node: { sourceUrl: "https://example.com/image.jpg", altText: "Alt text" } },
}

describe("ArticleClientContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bookmarkMocks.reset()
  })

  it("requests related posts using the post id when available", async () => {
    const initialData = { ...baseInitialData, id: 123 }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    await waitFor(() => {
      expect(getRelatedPostsForCountry).toHaveBeenCalledWith("ng", "123", 6)
    })
  })

  it("does not request related posts until the id is available", async () => {
    const initialData = { ...baseInitialData }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    await waitFor(() => {
      expect(getRelatedPostsForCountry).not.toHaveBeenCalled()
    })
  })

  it("renders without author data", () => {
    const initialData = { ...baseInitialData, author: null }

    expect(() =>
      render(
        <ArticleClientContent
          slug="test-slug"
          countryCode="ng"
          initialData={initialData}
        />,
      ),
    ).not.toThrow()
  })

  it("renders the bookmark button and toggles state through the bookmarks provider", async () => {
    const user = userEvent.setup()
    const initialData = { ...baseInitialData, id: 123 }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    const bookmarkButton = screen.getByRole("button", { name: /add bookmark/i })
    expect(bookmarkButton).toBeInTheDocument()

    await user.click(bookmarkButton)

    await waitFor(() => {
      expect(bookmarkMocks.addBookmarkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          post_id: "123",
          country: "ng",
          slug: "test-slug",
          title: initialData.title,
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove bookmark/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /remove bookmark/i }))

    await waitFor(() => {
      expect(bookmarkMocks.removeBookmarkMock).toHaveBeenCalledWith("123")
    })
  })
})
