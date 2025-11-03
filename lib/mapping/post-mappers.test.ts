import { describe, expect, it } from "vitest"

import { mapGraphqlPostToWordPressPost, mapRestPostToWordPressPost } from "@/lib/mapping/post-mappers"

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

describe("mapRestPostToWordPressPost", () => {
  it("normalizes REST API posts into WordPressPost shape", () => {
    const restPost = {
      id: 101,
      slug: "rest-post",
      date: "2024-06-01T00:00:00Z",
      modified: "2024-06-01T05:00:00Z",
      link: "https://example.com/rest-post/",
      title: { rendered: "REST Title" },
      excerpt: { rendered: "<p>REST excerpt</p>" },
      content: { rendered: "<p>REST content</p>" },
      _embedded: {
        author: [
          {
            id: 9,
            name: "REST Author",
            slug: "rest-author",
            description: "Reporter",
            avatar_urls: {
              "96": "https://example.com/avatar-96.jpg",
            },
          },
        ],
        "wp:featuredmedia": [
          {
            source_url: "https://example.com/feature.jpg",
            alt_text: "Feature alt",
            caption: { rendered: "<p>Feature caption</p>" },
            media_details: { width: 1200, height: 800 },
          },
        ],
        "wp:term": [
          [
            {
              id: 3,
              taxonomy: "category",
              name: "Politics",
              slug: "politics",
              description: "Politics category",
              count: 5,
            },
          ],
          [
            {
              id: 5,
              taxonomy: "post_tag",
              name: "Breaking",
              slug: "breaking",
            },
          ],
        ],
      },
    }

    const result = mapRestPostToWordPressPost(restPost as any, countryCode)

    expect(result).toMatchObject({
      databaseId: 101,
      id: "101",
      slug: "rest-post",
      date: "2024-06-01T00:00:00Z",
      title: "REST Title",
      excerpt: "<p>REST excerpt</p>",
      content: "<p>REST content</p>",
      link: "https://example.com/rest-post/",
      author: {
        databaseId: 9,
        name: "REST Author",
        slug: "rest-author",
        description: "Reporter",
        avatar: { url: "https://example.com/avatar-96.jpg" },
      },
      featuredImage: {
        node: {
          sourceUrl: "https://example.com/feature.jpg",
          altText: "Feature alt",
          caption: "<p>Feature caption</p>",
        },
      },
    })
    expect(result.categories?.nodes?.[0]).toMatchObject({ slug: "politics", count: 5 })
    expect(result.tags?.nodes?.[0]?.slug).toBe("breaking")
  })
})
