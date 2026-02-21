import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getPostsByCategoryForCountryMock = vi.fn()
const mapWordPressPostsToPostListItemsMock = vi.fn()
const fetchTaggedPostsMock = vi.fn()

vi.mock("@/lib/wordpress/service", () => ({
  getPostsByCategoryForCountry: getPostsByCategoryForCountryMock,
}))

vi.mock("@/lib/data/post-list", () => ({
  mapWordPressPostsToPostListItems: mapWordPressPostsToPostListItemsMock,
}))

vi.mock("@/lib/wordpress/service", () => ({
  fetchTaggedPosts: fetchTaggedPostsMock,
}))

beforeEach(() => {
  vi.resetModules()
  getPostsByCategoryForCountryMock.mockReset()
  mapWordPressPostsToPostListItemsMock.mockReset()
  fetchTaggedPostsMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("content server actions", () => {
  it("fetches and maps category posts", async () => {
    const posts = [{ id: "1" }, { id: "2" }]
    getPostsByCategoryForCountryMock.mockResolvedValue({
      posts,
      hasNextPage: true,
      endCursor: "cursor-1",
    })
    mapWordPressPostsToPostListItemsMock.mockReturnValue([
      { id: "1", title: "One" },
      { id: "2", title: "Two" },
    ])

    const { fetchCategoryPostsAction } = await import("./content")

    const result = await fetchCategoryPostsAction({
      countryCode: "ng",
      slug: "politics",
      first: 5,
      after: "cursor-0",
    })

    expect(getPostsByCategoryForCountryMock).toHaveBeenCalledWith("ng", "politics", 5, "cursor-0")
    expect(mapWordPressPostsToPostListItemsMock).toHaveBeenCalledWith(posts, "ng")
    expect(result).toEqual({
      posts: [
        { id: "1", title: "One" },
        { id: "2", title: "Two" },
      ],
      pageInfo: {
        hasNextPage: true,
        endCursor: "cursor-1",
      },
    })
  })

  it("delegates to fetchTaggedPosts", async () => {
    const payload = {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    }
    fetchTaggedPostsMock.mockResolvedValue(payload)

    const { fetchTaggedPostsAction } = await import("./content")

    const result = await fetchTaggedPostsAction({
      slug: "tech",
      countryCode: "ng",
      first: 8,
      after: "cursor-3",
    })

    expect(fetchTaggedPostsMock).toHaveBeenCalledWith({
      slug: "tech",
      countryCode: "ng",
      first: 8,
      after: "cursor-3",
    })
    expect(result).toBe(payload)
  })
})
