import { describe, it, expect, vi, afterEach } from "vitest";
import { getRelatedPosts, fetchPost } from "./wordpress-api";

// Restore global fetch after each test
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchPost", () => {
  it("returns post data with featured image", async () => {
    const mockPost = [
      {
        id: 1,
        slug: "test",
        title: { rendered: "Test" },
        excerpt: { rendered: "" },
        content: { rendered: "content" },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg", alt_text: "img" }] },
      },
    ]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPost }))
    const result = await fetchPost({ countryCode: "sz", slug: "test" })
    expect(result?.featuredImage?.node.sourceUrl).toBe("img.jpg")
    expect(result?.title?.rendered).toBe("Test")
  })

  it("returns null on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const result = await fetchPost({ countryCode: "sz", slug: "test" })
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
        content: { rendered: '<a href="/post/old">link</a>' },
        _embedded: { "wp:featuredmedia": [{ source_url: "img.jpg" }] },
      },
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => mockPosts })
    vi.stubGlobal("fetch", fetchMock)
    const result = await getRelatedPosts("1", [], ["news"])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("tags_relation=AND"),
      expect.anything(),
    )
    expect(result[0].featuredImage?.node.sourceUrl).toBe("img.jpg")
    expect(result[0].content?.rendered).toContain('/sz/article/old')
  })
})
