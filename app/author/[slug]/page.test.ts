import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/wordpress-api", () => ({
  getAuthorBySlug: vi.fn(),
}))

vi.mock("@/lib/log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import { generateMetadata } from "./page"
import { getAuthorBySlug } from "@/lib/wordpress-api"

const buildPost = () => ({
  id: 10,
  date: "2024-01-01T00:00:00Z",
  slug: "first-post",
  title: { rendered: "First Post" },
  excerpt: { rendered: "A short excerpt" },
  content: { rendered: "<p>Content</p>" },
  categories: { nodes: [{ id: 2, name: "Politics", slug: "politics" }] },
  tags: { nodes: [] },
  author: { node: { id: 1, name: "Jane Doe", slug: "jane-doe" } },
  featuredImage: { node: { sourceUrl: "https://example.com/post.jpg" } },
})

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates metadata for an existing author", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      author: {
        id: 1,
        name: "Jane Doe",
        slug: "jane-doe",
        description: "Investigative reporter",
        avatar: { url: "https://example.com/avatar.jpg" },
      },
      posts: [buildPost()],
    })

    const metadata = await generateMetadata({ params: { slug: "jane-doe" } })

    expect(metadata.title).toBe("Jane Doe - News On Africa")
    expect(metadata.description).toBe("Investigative reporter")
    expect(metadata.keywords).toContain("Politics")
    expect(metadata.openGraph?.images?.[0]?.url).toBe("https://example.com/avatar.jpg")
    expect(getAuthorBySlug).toHaveBeenCalledWith(
      "jane-doe",
      expect.objectContaining({ postLimit: 12 }),
    )
  })

  it("returns not-found metadata when the author is missing", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(null)

    const metadata = await generateMetadata({ params: { slug: "missing-author" } })

    expect(metadata.title).toBe("Author Not Found - News On Africa")
    expect(metadata.robots?.index).toBe(false)
    expect(metadata.description).toContain("could not be found")
  })
})
