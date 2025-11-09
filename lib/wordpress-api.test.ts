import { afterEach, describe, expect, it, vi } from "vitest"

import * as wordpressApi from "./wordpress-api"
import { __getMemoizedRequestsForTests } from "./wordpress/client"

const createGraphqlPost = (id: number, prefix = "post") => ({
  databaseId: id,
  id: `gid://post/${id}`,
  slug: `${prefix}-${id}`,
  date: "2024-05-01T00:00:00Z",
  modified: "2024-05-02T00:00:00Z",
  title: `${prefix} title ${id}`,
  excerpt: `${prefix} excerpt ${id}`,
  content: `<p>${prefix} content ${id}</p>`,
  uri: `/${prefix}-${id}/`,
  link: `https://example.com/${prefix}-${id}`,
  featuredImage: { node: { sourceUrl: `${prefix}-${id}.jpg`, altText: `${prefix} alt ${id}` } },
  categories: { nodes: [] },
  tags: { nodes: [] },
  author: { node: { id: `gid://user/${id}`, databaseId: id, name: `${prefix} author`, slug: `${prefix}-author` } },
  countries: { nodes: [] },
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  __getMemoizedRequestsForTests().clear()
})

describe("fetchPost", () => {
  it("returns GraphQL post data with featured image", async () => {
    const graphqlResponse = {
      data: {
        posts: {
          nodes: [createGraphqlPost(1, "sample")],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.fetchPost({ countryCode: "sz", slug: "sample-1" })

    expect(result).not.toBeNull()
    expect(result?.slug).toBe("sample-1")
    expect(result?.featuredImage?.node.sourceUrl).toBe("sample-1.jpg")
  })

  it("returns null when GraphQL returns no nodes", async () => {
    const graphqlResponse = {
      data: {
        posts: {
          nodes: [],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.fetchPost({ countryCode: "sz", slug: "missing" })
    expect(result).toBeNull()
  })
})

describe("fetchWordPressGraphQL", () => {
  it("returns GraphQL data when response contains data", async () => {
    const mockData = { posts: { nodes: [] } }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: mockData }),
      }),
    )

    const result = await wordpressApi.fetchWordPressGraphQL<typeof mockData>("sz", "query")
    expect(result).toEqual(mockData)
  })

  it("forwards configured WordPress auth headers during server fetches", async () => {
    vi.stubEnv(
      "WORDPRESS_GRAPHQL_AUTH_HEADER",
      JSON.stringify({ Authorization: "Bearer secret", "X-Role": "editor" }),
    )

    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)
    const originalWindow = (globalThis as { window?: unknown }).window
    ;(globalThis as { window?: unknown }).window = undefined

    try {
      await wordpressApi.fetchWordPressGraphQL("sz", "query")
    } finally {
      if (typeof originalWindow === "undefined") {
        delete (globalThis as { window?: unknown }).window
      } else {
        ;(globalThis as { window?: unknown }).window = originalWindow
      }
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
      "X-Role": "editor",
    })
  })
})

describe("getRelatedPosts", () => {
  it("maps related posts returned from GraphQL", async () => {
    const graphqlResponse = {
      data: {
        posts: {
          nodes: [createGraphqlPost(11, "related")],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getRelatedPosts("42", [], ["analysis"], 3, "sz")

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe("related-11")
  })
})

describe("getPostsForCategories", () => {
  it("returns category buckets from GraphQL", async () => {
    const graphqlResponse = {
      data: {
        categories: {
          nodes: [
            {
              databaseId: 5,
              name: "News",
              slug: "news",
              description: "Latest news",
              count: 2,
              posts: {
                pageInfo: { hasNextPage: false, endCursor: "cursor" },
                nodes: [createGraphqlPost(21, "news")],
              },
            },
          ],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getPostsForCategories("sz", ["news"], 5)

    expect(result.news.category?.name).toBe("News")
    expect(result.news.posts).toHaveLength(1)
  })
})

describe("getPostsByCategoryForCountry", () => {
  it("requests category posts without forcing fp tag and returns GraphQL data", async () => {
    const capturedBodies: string[] = []

    const graphqlResponse = {
      data: {
        categories: { nodes: [{ databaseId: 8, name: "Politics", slug: "politics" }] },
        posts: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [createGraphqlPost(31, "politics")],
        },
      },
    }

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body === "string") {
        capturedBodies.push(init.body)
      }
      return new Response(JSON.stringify(graphqlResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const result = await wordpressApi.getPostsByCategoryForCountry("za", "politics", 6)

    expect(result.posts).toHaveLength(1)
    expect(result.category?.name).toBe("Politics")
    const parsedRequests = capturedBodies.map((body) => JSON.parse(body) as { variables?: Record<string, unknown> })
    expect(parsedRequests).not.toHaveLength(0)
    parsedRequests.forEach((request) => {
      expect(request.variables?.tagSlugs).toBeUndefined()
    })
  })
})

describe("fetchMostReadPosts", () => {
  it("normalizes rendered text responses", async () => {
    const payload = [
      {
        id: 7,
        slug: "encoded",
        title: { rendered: "Leaders say &#39;hi&#39;" },
        excerpt: { rendered: "It&#39;s great" },
        date: "2024-05-01",
      },
    ]

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    )

    const result = await wordpressApi.fetchMostReadPosts("sz", 1)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("Leaders say 'hi'")
    expect(result[0].excerpt).toBe("It's great")
  })
})

describe("getFrontPageSlicesForCountry", () => {
  const createNode = (id: number, prefix: string) => ({
    ...createGraphqlPost(id, prefix),
    slug: `${prefix.toLowerCase()}-${id}`,
    featuredImage: { node: null },
  })

  it("builds hero, trending, and latest slices from GraphQL", async () => {
    const graphqlResponse = {
      data: {
        hero: { nodes: [createNode(101, "Hero"), createNode(102, "Hero")] },
        latest: {
          pageInfo: { hasNextPage: true, endCursor: "cursor-30" },
          edges: Array.from({ length: 30 }, (_, index) => ({
            cursor: `cursor-${index + 1}`,
            node: createNode(index + 1, "Latest"),
          })),
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getFrontPageSlicesForCountry("za")

    expect(result.hero.heroPost?.slug).toBe("hero-101")
    expect(result.trending.posts).toHaveLength(7)
    expect(result.latest.posts).toHaveLength(20)
  })
})

describe("getFpTaggedPostsForCountry", () => {
  it("returns mapped posts when GraphQL resolves nodes", async () => {
    const graphqlResponse = {
      data: {
        posts: {
          nodes: [createGraphqlPost(201, "fp"), createGraphqlPost(202, "fp")],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getFpTaggedPostsForCountry("za", 2)

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe("fp-201")
  })
})

describe("getLatestPostsForCountry", () => {
  it("returns paginated GraphQL posts", async () => {
    const graphqlResponse = {
      data: {
        posts: {
          pageInfo: { hasNextPage: true, endCursor: "cursor-2" },
          nodes: [createGraphqlPost(1, "latest"), createGraphqlPost(2, "latest")],
        },
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getLatestPostsForCountry("za", 2)

    expect(result.posts).toHaveLength(2)
    expect(result.hasNextPage).toBe(true)
    expect(result.endCursor).toBe("cursor-2")
  })

  it("returns empty pagination when GraphQL returns null", async () => {
    const graphqlResponse = {
      data: {
        posts: null,
      },
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => graphqlResponse,
      }),
    )

    const result = await wordpressApi.getLatestPostsForCountry("za", 3)

    expect(result).toEqual({ posts: [], hasNextPage: false, endCursor: null })
  })
})
