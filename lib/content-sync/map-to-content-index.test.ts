import { describe, expect, it } from "vitest";

import { mapPostToContentIndexRow } from "@/lib/content-sync/map-to-content-index";
import type { Post } from "@/lib/dal/types";

const basePost: Post = {
  id: 101,
  slug: "election-results",
  country: "ng",
  title: "Election Results",
  excerpt: "Short summary",
  content: "<p>" + "word ".repeat(2000) + "</p>",
  status: "publish",
  publishedAt: "2026-06-01T08:00:00",
  updatedAt: "2026-06-02T08:00:00",
  featuredImage: { url: "https://cdn.example.com/img.jpg", alt: "" },
  categories: [{ id: 1, name: "Politics", slug: "politics" }],
  tags: [{ id: 2, name: "Breaking", slug: "breaking" }],
  author: { id: 3, name: "Jane Doe", slug: "jane-doe" },
};

describe("mapPostToContentIndexRow", () => {
  it("maps a fully-populated post", () => {
    const row = mapPostToContentIndexRow(basePost);

    expect(row.wp_post_id).toBe(101);
    expect(row.edition_code).toBe("ng");
    expect(row.slug).toBe("election-results");
    expect(row.url_path).toBe("/ng/article/election-results");
    expect(row.title).toBe("Election Results");
    expect(row.excerpt).toBe("Short summary");
    expect(row.author).toBe("Jane Doe");
    expect(row.categories).toEqual(["Politics"]);
    expect(row.tags).toEqual(["Breaking"]);
    expect(row.featured_image_url).toBe("https://cdn.example.com/img.jpg");
    expect(row.published_at).toBe("2026-06-01T08:00:00");
  });

  it("caps content_plain at 5000 characters", () => {
    const row = mapPostToContentIndexRow(basePost);
    expect(row.content_plain?.length).toBeLessThanOrEqual(5000);
  });

  it("falls back to null for missing optional fields", () => {
    const row = mapPostToContentIndexRow({
      ...basePost,
      excerpt: "",
      featuredImage: null,
      author: null,
      categories: [],
      tags: [],
    });

    expect(row.excerpt).toBeNull();
    expect(row.featured_image_url).toBeNull();
    expect(row.author).toBeNull();
    expect(row.categories).toEqual([]);
    expect(row.tags).toEqual([]);
  });
});
