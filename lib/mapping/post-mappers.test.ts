import { describe, expect, it } from "vitest"

import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"

const countryCode = "za"

describe("mapGraphqlPostToWordPressPost", () => {
  it("normalizes GraphQL posts into WordPressPost shape", () => {
    const graphqlPost = {
      databaseId: 42,
      id: "cG9zdDo0Mg==",
      slug: "rendered-title",
      date: "2024-05-01T00:00:00Z",
      modified: "2024-05-02T00:00:00Z",
      title: "Rendered title",
      excerpt: "Rendered excerpt",
      content: "<p>Rendered content</p>",
      uri: "/rendered-title/",
      link: "https://example.com/rendered-title",
      featuredImage: {
        node: {
          sourceUrl: "https://example.com/img.jpg",
          altText: "Alt text",
          caption: "Image caption",
          mediaDetails: { width: 1200, height: 800 },
        },
      },
      author: {
        node: {
          databaseId: 7,
          id: "dXNlcjo3",
          name: "Author Name",
          slug: "author-name",
          avatar: { url: "https://example.com/avatar.jpg" },
        },
      },
      categories: {
        nodes: [
          { databaseId: 3, id: "Y2F0ZWdvcnk6Mw==", name: "Category", slug: "category" },
        ],
      },
      tags: {
        nodes: [{ databaseId: 5, id: "dGFnOjU=", name: "Tag", slug: "tag" }],
      },
      countries: {
        nodes: [{ databaseId: 9, slug: "za" }],
      },
    }

    const result = mapGraphqlPostToWordPressPost(graphqlPost as any, countryCode)

    expect(result).toMatchObject({
      databaseId: 42,
      id: "cG9zdDo0Mg==",
      slug: "rendered-title",
      title: "Rendered title",
      excerpt: "Rendered excerpt",
      content: "<p>Rendered content</p>",
      featuredImage: {
        node: {
          sourceUrl: "https://example.com/img.jpg",
          altText: "Alt text",
          caption: "Image caption",
        },
      },
      author: {
        databaseId: 7,
        name: "Author Name",
        slug: "author-name",
      },
    })
    expect(result.categories?.nodes?.[0]?.slug).toBe("category")
    expect(result.tags?.nodes?.[0]?.slug).toBe("tag")
    expect(result.globalRelayId).toBe("cG9zdDo0Mg==")
  })
})
