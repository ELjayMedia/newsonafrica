import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"

const countryCode = "za"

describe("mapGraphqlPostToWordPressPost", () => {
  const baseGraphqlPost = {
    databaseId: 42,
    id: "cG9zdDo0Mg==",
    slug: "rendered-title",
    date: "2024-05-01T00:00:00Z",
    modified: "2024-05-02T00:00:00Z",
    title: "Rendered title",
    excerpt: "Rendered excerpt",
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

  it("normalizes GraphQL summary posts into WordPressPost shape", () => {
    const result = mapGraphqlPostToWordPressPost(baseGraphqlPost as any, countryCode)

    expect(result).toMatchObject({
      databaseId: 42,
      id: "cG9zdDo0Mg==",
      slug: "rendered-title",
      title: "Rendered title",
      excerpt: "Rendered excerpt",
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
    expect(result.content).toBeUndefined()
  })

  it("normalizes rendered content in a stable and safe way", () => {
    const detailedGraphqlPost = {
      ...baseGraphqlPost,
      content:
        '<p><a href="/post/local-story">Local story</a></p>' +
        '<script>alert("xss")</script>' +
        '<div class="wp-block-embed__wrapper">https://youtu.be/dQw4w9WgXcQ?t=43</div>',
    }

    const result = mapGraphqlPostToWordPressPost(detailedGraphqlPost as any, countryCode)

    expect(result.content).toContain('href="/za/article/local-story"')
    expect(result.content).not.toContain("<script")
    expect(result.content).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?start=43")
  })

  it("returns deterministic output for unsupported embeds", () => {
    const detailedGraphqlPost = {
      ...baseGraphqlPost,
      content: '<div class="wp-block-embed__wrapper">https://example.com/video/123</div>',
    }

    const result = mapGraphqlPostToWordPressPost(detailedGraphqlPost as any, countryCode)

    expect(result.content).toBe('<div class="wp-block-embed__wrapper">https://example.com/video/123</div>')
  })
})
