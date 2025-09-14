import { describe, it, expect, vi, afterEach } from "vitest";
import { getPostBySlugForCountry, getRelatedPosts } from "./wordpress-api";

// Restore global fetch after each test
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPostBySlugForCountry", () => {
  it("returns post data with featured image", async () => {
    const mockPost = [
      {
        id: 1,
        slug: "test",
        title: { rendered: "Test" },
        excerpt: { rendered: "" },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg", alt_text: "img" }] },
      },
    ]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPost }))
    const result = await getPostBySlugForCountry("sz", "test")
    expect(result?.featuredImage?.node.sourceUrl).toBe("img.jpg")
  })

  it("returns null on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const result = await getPostBySlugForCountry("sz", "test")
    expect(result).toBeNull()
  })
})

describe("getRelatedPosts", () => {
  it("returns empty array on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const result = await getRelatedPosts("1", [], ["news"]);
    expect(result).toEqual([]);
  });

  it("returns posts on 200 response", async () => {
    const mockPosts = [
      {
        id: 2,
        slug: "hello",
        title: { rendered: "Hello" },
        excerpt: { rendered: "" },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg" }] },
      },
    ]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPosts }))
    const result = await getRelatedPosts("1", [], ["news"])
    expect(result[0].featuredImage?.node.sourceUrl).toBe("img.jpg")
  })
})
