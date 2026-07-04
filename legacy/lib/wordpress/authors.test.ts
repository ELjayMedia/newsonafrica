// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./client", () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

import { fetchWordPressGraphQL } from "./client"
import { fetchAuthors, fetchAuthorData, getAuthorBySlug } from "./authors"
import { CACHE_DURATIONS } from "../cache/constants"
import { cacheTags } from "../cache/cacheTags"
import { AUTHOR_DATA_QUERY, AUTHORS_QUERY } from "@/lib/wordpress/queries"

const mockFetchFromWpGraphQL = vi.mocked(fetchWordPressGraphQL)

const graphqlSuccess = <T,>(data: T) => ({
  ok: true as const,
  data,
  ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
})

describe("wordpress authors GraphQL helpers", () => {
  beforeEach(() => {
    mockFetchFromWpGraphQL.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("maps author lists from GraphQL", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce(
      graphqlSuccess({
        users: {
          nodes: [
            {
              id: Buffer.from("user:42").toString("base64"),
              databaseId: null,
              name: "Jane Doe",
              slug: "jane-doe",
              description: "  Investigative journalist  ",
              avatar: { url: "https://example.com/avatar.jpg" },
            },
            null,
          ],
        },
      }) as any,
    )

    const authors = await fetchAuthors("za")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      AUTHORS_QUERY,
      { first: 100 },
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.NONE,
        tags: [cacheTags.edition("za")],
      }),
    )
    expect(authors).toHaveLength(1)
    expect(authors[0]).toMatchObject({
      databaseId: 42,
      slug: "jane-doe",
      description: "Investigative journalist",
      avatar: { url: "https://example.com/avatar.jpg" },
    })
  })

  it("returns author details with posts from GraphQL", async () => {
    const postNode = {
      databaseId: 101,
      id: "cG9zdDoxMDE=",
      slug: "first-story",
      title: "First Story",
      excerpt: "Excerpt",
      content: "Content",
      date: "2024-01-01T00:00:00Z",
      modified: "2024-01-02T00:00:00Z",
    }

    mockFetchFromWpGraphQL.mockResolvedValueOnce(
      graphqlSuccess({
        user: {
          id: Buffer.from("user:7").toString("base64"),
          databaseId: null,
          name: "John Doe",
          slug: "john-doe",
          description: "  Reporter  ",
          avatar: { url: "https://example.com/john.jpg" },
          posts: {
            nodes: [postNode, null],
            pageInfo: { endCursor: undefined, hasNextPage: true },
          },
        },
      }) as any,
    )

    const result = await fetchAuthorData("john-doe", null, "ng", 5)

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "ng",
      AUTHOR_DATA_QUERY,
      { slug: "john-doe", first: 5 },
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.NONE,
        operationName: "AuthorData",
        routeContext: { route: "/author/[slug]", surface: "author_profile" },
        tags: [cacheTags.edition("ng"), cacheTags.author("ng", "john-doe")],
      }),
    )
    expect(result).not.toBeNull()
    expect(result?.author).toMatchObject({
      databaseId: 7,
      name: "John Doe",
      slug: "john-doe",
      description: "Reporter",
      avatar: { url: "https://example.com/john.jpg" },
    })
    expect(result?.posts.nodes).toHaveLength(1)
    expect(result?.posts.nodes[0]).toMatchObject({
      databaseId: 101,
      slug: "first-story",
      title: "First Story",
    })
    expect(result?.posts.pageInfo).toMatchObject({ endCursor: null, hasNextPage: true })
  })

  it("passes the cursor only when one is provided", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce(graphqlSuccess({ user: null }) as any)

    await fetchAuthorData("john-doe", "cursor-1", "ng", 5)

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "ng",
      AUTHOR_DATA_QUERY,
      { slug: "john-doe", first: 5, after: "cursor-1" },
      expect.any(Object),
    )
  })

  it("returns normalized author lookup results", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce(
      graphqlSuccess({
        user: {
          id: Buffer.from("user:9").toString("base64"),
          databaseId: null,
          name: "Alex Smith",
          slug: "alex-smith",
          description: "Reporter",
          avatar: { url: "https://example.com/alex.jpg" },
          posts: {
            nodes: [
              {
                databaseId: 210,
                id: "cG9zdDoyMTA=",
                slug: "breaking-news",
                title: "Breaking News",
                excerpt: "Excerpt",
                content: "Content",
              },
            ],
            pageInfo: { endCursor: "cursor", hasNextPage: false },
          },
        },
      }) as any,
    )

    const result = await getAuthorBySlug("alex-smith", { countryCode: "za", postLimit: 2 })

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      AUTHOR_DATA_QUERY,
      { slug: "alex-smith", first: 2 },
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.NONE,
        operationName: "AuthorData",
        routeContext: { route: "/author/[slug]", surface: "author_profile" },
        tags: [cacheTags.edition("za"), cacheTags.author("za", "alex-smith")],
      }),
    )
    expect(result).not.toBeNull()
    expect(result?.author.slug).toBe("alex-smith")
    expect(result?.posts).toHaveLength(1)
    expect(result?.pageInfo).toEqual({ endCursor: "cursor", hasNextPage: false })
  })

  it("returns null when no author is found", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce(graphqlSuccess({ user: null }) as any)

    const result = await getAuthorBySlug("missing")

    expect(result).toBeNull()
  })
})
