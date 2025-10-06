import { describe, it, expect, vi, afterEach } from "vitest"
import * as wordpressApi from "./wordpress-api"

// Restore global fetch after each test
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchPost", () => {
  it("returns post data with featured image", async () => {
    const mockPost = [
      {
        id: 1,
        slug: "test",
        title: { rendered: "Test" },
        excerpt: { rendered: "" },
        content: { rendered: "content" },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg", alt_text: "img" }] },
      },
    ]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPost }))
    const result = await wordpressApi.fetchPost({ countryCode: "sz", slug: "test" })
    expect(result?.featuredImage?.node.sourceUrl).toBe("img.jpg")
    expect(result?.title).toBe("Test")
  })

  it("returns null on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const result = await wordpressApi.fetchPost({ countryCode: "sz", slug: "test" })
    expect(result).toBeNull()
  })
})

describe("fetchFromWpGraphQL", () => {
  it("returns GraphQL data when response contains data", async () => {
    const mockData = { posts: { nodes: [] } }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockData }),
    }))

    const result = await wordpressApi.fetchFromWpGraphQL<typeof mockData>("sz", "query")

    expect(result).toEqual(mockData)
  })
})

describe("getRelatedPosts", () => {
  it("returns empty array on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const result = await wordpressApi.getRelatedPosts("1", [], ["news"])
    expect(result).toEqual([])
  })

  it("returns posts on 200 response", async () => {
    const mockPosts = [
      {
        id: 2,
        slug: "hello",
        title: { rendered: "Hello" },
        excerpt: { rendered: "" },
        content: { rendered: '<a href="/post/old">link</a>' },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg" }] },
      },
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => mockPosts })
    vi.stubGlobal("fetch", fetchMock)
    const result = await wordpressApi.getRelatedPosts("1", [], ["news"])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("tags_relation=AND"),
      expect.anything(),
    )
    expect(result[0].featuredImage?.node.sourceUrl).toBe("img.jpg")
    expect(result[0].content).toContain('/sz/article/old')
  })
})

describe("getPostsForCategories", () => {
  const createRestPost = (id: number, slug: string) => ({
    id,
    date: new Date().toISOString(),
    slug: `${slug}-post-${id}`,
    title: { rendered: `${slug} story ${id}` },
    excerpt: { rendered: `${slug} excerpt ${id}` },
    content: { rendered: `<p>${slug} content ${id}</p>` },
    _embedded: {
      'wp:featuredmedia': [
        {
          source_url: `${slug}-${id}.jpg`,
          alt_text: `${slug} image ${id}`,
          media_details: { width: 1200, height: 800 },
        },
      ],
      'wp:term': [
        [
          {
            id: id * 10,
            name: slug,
            slug,
          },
        ],
        [],
      ],
    },
  })

  it("batches GraphQL requests when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          categories: {
            nodes: [
              {
                databaseId: 1,
                name: 'News',
                slug: 'news',
                description: 'Latest news',
                count: 5,
                posts: {
                  pageInfo: { hasNextPage: false, endCursor: 'cursor' },
                  nodes: [
                    {
                      databaseId: 10,
                      id: 'gid://post/10',
                      slug: 'news-post',
                      date: '2024-01-01T00:00:00Z',
                      title: 'News GraphQL Title',
                      excerpt: 'News GraphQL Excerpt',
                      content: '<p>News GraphQL Content</p>',
                      featuredImage: {
                        node: {
                          sourceUrl: 'news.jpg',
                          altText: 'News',
                          mediaDetails: { width: 1200, height: 800 },
                        },
                      },
                      categories: { nodes: [] },
                      tags: { nodes: [] },
                      author: { node: { id: 'gid://user/1', name: 'Author', slug: 'author' } },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await wordpressApi.getPostsForCategories('sz', ['news'], 5)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results.news.category?.name).toBe('News')
    expect(results.news.posts).toHaveLength(1)
    expect(results.news.hasNextPage).toBe(false)
    expect(results.news.endCursor).toBe('cursor')
  })

  it("falls back to REST and skips failed categories", async () => {
    const graphQLSpy = vi
      .spyOn(wordpressApi, 'fetchFromWpGraphQL')
      .mockResolvedValue(null)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.url

      if (url.includes('/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: 'News', slug: 'news', description: 'News desc', count: 1 },
            { id: 2, name: 'Business', slug: 'business', description: 'Business desc', count: 1 },
          ],
        })
      }

      if (url.includes('categories=1')) {
        return Promise.resolve({ ok: true, json: async () => [createRestPost(1, 'news')] })
      }

      if (url.includes('categories=2')) {
        return Promise.resolve({ ok: false, status: 500 })
      }

      return Promise.resolve({ ok: true, json: async () => [] })
    })

    const results = await wordpressApi.getPostsForCategories(
      'sz',
      ['news', 'business', 'unknown'],
      5,
    )

    const categoryCall = fetchMock.mock.calls.find((call) =>
      call[0].toString().includes('/categories'),
    )

    expect(categoryCall).toBeTruthy()
    expect(results.news.posts).toHaveLength(1)
    expect(results.news.category?.slug).toBe('news')
    expect(results.business.posts).toEqual([])
    expect(results.business.category?.slug).toBe('business')
    expect(results.unknown.category).toBeNull()
    expect(results.unknown.posts).toEqual([])

    graphQLSpy.mockRestore()
  })
})

describe("getFrontPageSlicesForCountry", () => {
  const createNode = (id: number, prefix: string) => ({
    databaseId: id,
    id: `gid://post/${id}`,
    slug: `${prefix.toLowerCase()}-${id}`,
    date: "2024-05-01T00:00:00Z",
    title: `${prefix} ${id}`,
    excerpt: `${prefix} excerpt ${id}`,
    content: null,
    featuredImage: { node: null },
    categories: { nodes: [] },
    tags: { nodes: [] },
    author: { node: null },
  })

  it("aggregates hero, trending, and latest slices in a single GraphQL call", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url.endsWith("/graphql")) {
        return new Response(
          JSON.stringify({
            data: {
              hero: {
                nodes: [createNode(201, "Hero"), createNode(202, "Hero")],
              },
              latest: {
                pageInfo: { hasNextPage: true, endCursor: "cursor-30" },
                edges: Array.from({ length: 30 }, (_, index) => ({
                  cursor: `cursor-${index + 1}`,
                  node: createNode(index + 1, "Latest"),
                })),
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const result = await wordpressApi.getFrontPageSlicesForCountry("za")

    expect(fetchMock).toHaveBeenCalledTimes(1)

    expect(result.hero.heroPost?.slug).toBe("hero-201")
    expect(result.hero.secondaryStories).toHaveLength(1)

    expect(result.trending.posts).toHaveLength(7)
    expect(result.trending.posts[0].slug).toBe("latest-4")
    expect(result.trending.endCursor).toBe("cursor-10")
    expect(result.trending.hasNextPage).toBe(true)

    expect(result.latest.posts).toHaveLength(20)
    expect(result.latest.posts[0].slug).toBe("latest-11")
    expect(result.latest.endCursor).toBe("cursor-30")
    expect(result.latest.hasNextPage).toBe(true)
  })
})
