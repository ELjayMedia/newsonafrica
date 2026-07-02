import { describe, expect, it } from "vitest";

import { mapAuthor, mapCategory, mapPost, mapPostSummary, mapTag } from "@/lib/dal/mappers";
import type { WPRestAuthor, WPRestCategory, WPRestPost, WPRestTag } from "@/lib/wordpress/types";

const basePost: WPRestPost = {
  id: 42,
  date: "2026-06-01T10:00:00",
  modified: "2026-06-02T10:00:00",
  slug: "hello-world",
  status: "publish",
  link: "https://cms.test.example/za/hello-world",
  title: { rendered: "Hello &amp; World" },
  content: { rendered: "<p>Full content</p>" },
  excerpt: { rendered: "<p>Short &amp; sweet excerpt</p>" },
  author: 7,
  featured_media: 99,
  categories: [1],
  tags: [2],
};

describe("mapPost", () => {
  it("decodes entities in the title and strips HTML from the excerpt", () => {
    const post = mapPost(basePost, "za");
    expect(post.title).toBe("Hello & World");
    expect(post.excerpt).toBe("Short & sweet excerpt");
    expect(post.content).toBe("<p>Full content</p>");
    expect(post.country).toBe("za");
    expect(post.id).toBe(42);
  });

  it("maps embedded featured media, author and terms", () => {
    const embedded: WPRestPost = {
      ...basePost,
      _embedded: {
        author: [{ id: 7, name: "Jane Doe", slug: "jane-doe", avatar_urls: { "24": "a24.png", "96": "a96.png" } }],
        "wp:featuredmedia": [{ id: 99, source_url: "https://cdn.example.com/img.jpg", alt_text: "An image" }],
        "wp:term": [
          [{ id: 1, name: "Politics", slug: "politics", taxonomy: "category" }],
          [{ id: 2, name: "Breaking", slug: "breaking", taxonomy: "post_tag" }],
        ],
      },
    };

    const post = mapPost(embedded, "ng");

    expect(post.featuredImage).toEqual({ url: "https://cdn.example.com/img.jpg", alt: "An image" });
    expect(post.author).toEqual({ id: 7, name: "Jane Doe", slug: "jane-doe", avatarUrl: "a96.png" });
    expect(post.categories).toEqual([{ id: 1, name: "Politics", slug: "politics" }]);
    expect(post.tags).toEqual([{ id: 2, name: "Breaking", slug: "breaking" }]);
  });

  it("falls back to null/empty when nothing is embedded", () => {
    const post = mapPost(basePost, "sz");
    expect(post.featuredImage).toBeNull();
    expect(post.author).toBeNull();
    expect(post.categories).toEqual([]);
    expect(post.tags).toEqual([]);
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
    const raw: WPRestCategory = { id: 5, name: "Sport &amp; Leisure", slug: "sport", count: 12, description: "<p>All sport</p>" };
    expect(mapCategory(raw)).toEqual({ id: 5, name: "Sport & Leisure", slug: "sport", description: "All sport", postCount: 12 });
  });

  it("maps a tag", () => {
    const raw: WPRestTag = { id: 9, name: "Breaking", slug: "breaking", count: 3 };
    expect(mapTag(raw)).toEqual({ id: 9, name: "Breaking", slug: "breaking", postCount: 3 });
  });

  it("maps an author, preferring the largest avatar size", () => {
    const raw: WPRestAuthor = {
      id: 3,
      name: "John Smith",
      slug: "john-smith",
      description: "Reporter",
      avatar_urls: { "24": "a24.png", "48": "a48.png", "96": "a96.png" },
    };
    const author = mapAuthor(raw);
    expect(author.avatarUrl).toBe("a96.png");
    expect(author.bio).toBe("Reporter");
  });
});
