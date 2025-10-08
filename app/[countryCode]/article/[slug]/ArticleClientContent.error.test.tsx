import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock("@/lib/wordpress-api", () => ({
  getRelatedPostsForCountry: vi.fn(),
}))

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "user-1" },
  }),
}))

vi.mock("@/contexts/BookmarksContext", () => ({
  useBookmarks: () => ({
    isBookmarked: () => false,
    addBookmark: vi.fn().mockResolvedValue(undefined),
    removeBookmark: vi.fn().mockResolvedValue(undefined),
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

const mockGetRelatedPostsForCountry = vi.mocked(getRelatedPostsForCountry)

const baseInitialData = {
  categories: { nodes: [] },
  date: new Date().toISOString(),
  title: "Test Title",
  author: { node: { name: "Author Name" } },
  content: "<p>Content</p>",
  excerpt: "Summary",
  featuredImage: { node: { sourceUrl: "https://example.com/image.jpg", altText: "Alt text" } },
}

describe("ArticleClientContent error state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders an error state when fetching related posts fails", async () => {
    mockGetRelatedPostsForCountry.mockRejectedValueOnce(new Error("Network error"))

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Failed to load related articles.")).toBeInTheDocument()
    })

    expect(screen.queryByText("No related articles found.")).not.toBeInTheDocument()
  })
})
