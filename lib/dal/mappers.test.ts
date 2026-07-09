import { describe, expect, it } from "vitest";

import { mapAuthor, mapCategory, mapPost, mapPostSummary, mapTag } from "@/lib/dal/mappers";
import type { WPGraphQLAuthorNode, WPGraphQLPostNode, WPGraphQLTermNode } from "@/lib/wordpress/types";

const basePost: WPGraphQLPostNode = {
  databaseId: 42,
  id: "cG9zdDo0Mg==",
  slug: "hello-world",
  date: "2026-06-01T10:00:00",
  modified: "2026-06-02T10:00:00",
  status: "publish",
  title: "Hello &amp; World",
  excerpt: "<p>Short &amp; sweet excerpt</p>",
  content: "<p>Full content</p>",
};

describe("mapPost", () => {
  it("decodes entities in the title and strips HTML from the excerpt", () => {
    const post = mapPost(basePost, "za");
    expect(post.title).toBe("Hello & World");
    expect(post.excerpt).toBe("Short & sweet excerpt");
    expect(post.content).toBe("<p>Full content</p>");
    expect(post.country).toBe("za");
    expect(post.id).toBe(42);
    expect(post.publishedAt).toBe("2026-06-01T10:00:00");
    expect(post.updatedAt).toBe("2026-06-02T10:00:00");
  });

  it("maps featured image, author and terms from GraphQL connections", () => {
    const node: WPGraphQLPostNode = {
      ...basePost,
      featuredImage: {
        node: {
          sourceUrl: "https://cdn.example.com/img.jpg",
          altText: "An image",
          mediaDetails: { width: 800, height: 600 },
        },
      },
      author: {
        node: { databaseId: 7, name: "Jane Doe", slug: "jane-doe", avatar: { url: "a96.png" } },
      },
      categories: { nodes: [{ databaseId: 1, name: "Politics", slug: "politics" }] },
      tags: { nodes: [{ databaseId: 2, name: "Breaking", slug: "breaking" }] },
    };

    const post = mapPost(node, "ng");

    expect(post.featuredImage).toEqual({ url: "https://cdn.example.com/img.jpg", alt: "An image", width: 800, height: 600 });
    expect(post.author).toEqual({ id: 7, name: "Jane Doe", slug: "jane-doe", avatarUrl: "a96.png" });
    expect(post.categories).toEqual([{ id: 1, name: "Politics", slug: "politics" }]);
    expect(post.tags).toEqual([{ id: 2, name: "Breaking", slug: "breaking" }]);
  });

  it("falls back to null/empty when connections are absent", () => {
    const post = mapPost(basePost, "sz");
    expect(post.featuredImage).toBeNull();
    expect(post.author).toBeNull();
    expect(post.categories).toEqual([]);
    expect(post.tags).toEqual([]);
  });

  it("recovers the database id from a base64 relay id when databaseId is missing", () => {
    const post = mapPost({ ...basePost, databaseId: null, id: "cG9zdDo0Mg==" }, "za");
    expect(post.id).toBe(42);
  });

  it("ignores category/tag nodes without a slug", () => {
    const post = mapPost(
      { ...basePost, categories: { nodes: [{ databaseId: 1, name: "No slug", slug: null }, null] } },
      "za",
    );
    expect(post.categories).toEqual([]);
  });
});

describe("mapPostSummary", () => {
  it("omits content from the mapped post", () => {
    const summary = mapPostSummary(basePost, "za");
    expect(summary).not.toHaveProperty("content");
    expect(summary.title).toBe("Hello & World");
  });
});

describe("mapCategory / mapTag / mapAuthor", () => {
  it("maps a category", () => {
    const node: WPGraphQLTermNode = { databaseId: 5, name: "Sport &amp; Leisure", slug: "sport", count: 12, description: "<p>All sport</p>" };
    expect(mapCategory(node)).toEqual({ id: 5, name: "Sport & Leisure", slug: "sport", description: "All sport", postCount: 12 });
  });

  it("maps a tag", () => {
    const node: WPGraphQLTermNode = { databaseId: 9, name: "Breaking", slug: "breaking", count: 3 };
    expect(mapTag(node)).toEqual({ id: 9, name: "Breaking", slug: "breaking", postCount: 3 });
  });

  it("maps an author", () => {
    const node: WPGraphQLAuthorNode = {
      databaseId: 3,
      name: "John Smith",
      slug: "john-smith",
      description: "<p>Reporter</p>",
      avatar: { url: "a96.png" },
    };
    const author = mapAuthor(node);
    expect(author).toEqual({ id: 3, name: "John Smith", slug: "john-smith", bio: "Reporter", avatarUrl: "a96.png" });
  });
});
