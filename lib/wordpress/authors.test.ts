// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./client", () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

import { fetchWordPressGraphQL } from "./client"
import { fetchAuthors, fetchAuthorData, getAuthorBySlug } from "./authors"
import { AUTHOR_DATA_QUERY, AUTHORS_QUERY } from "../wordpress-queries"

const mockFetchFromWpGraphQL = vi.mocked(fetchWordPressGraphQL)

describe("wordpress authors GraphQL helpers", () => {
  beforeEach(() => {
    mockFetchFromWpGraphQL.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("maps author lists from GraphQL", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({
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
    } as any)

    const authors = await fetchAuthors("za")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      AUTHORS_QUERY,
      { first: 100 },
      ["country:za", "section:authors"],
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

    mockFetchFromWpGraphQL.mockResolvedValueOnce({
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
    } as any)

    const result = await fetchAuthorData("john-doe", null, "ng", 5)

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "ng",
      AUTHOR_DATA_QUERY,
      { slug: "john-doe", after: null, first: 5 },
      ["country:ng", "section:authors", "author:john-doe"],
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

  it("returns normalized author lookup results", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({
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
    } as any)

    const result = await getAuthorBySlug("alex-smith", { countryCode: "za", postLimit: 2 })

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      AUTHOR_DATA_QUERY,
      { slug: "alex-smith", after: null, first: 2 },
      ["country:za", "section:authors", "author:alex-smith"],
    )
    expect(result).not.toBeNull()
    expect(result?.author.slug).toBe("alex-smith")
    expect(result?.posts).toHaveLength(1)
    expect(result?.pageInfo).toEqual({ endCursor: "cursor", hasNextPage: false })
  })

  it("returns null when no author is found", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({ user: null } as any)

    const result = await getAuthorBySlug("missing")

    expect(result).toBeNull()
  })
})
