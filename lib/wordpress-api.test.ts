import { describe, it, expect, vi, afterEach } from "vitest";
import { getPostBySlugForCountry, getRelatedPosts } from "./wordpress-api";

// Restore global fetch after each test
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPostBySlugForCountry", () => {
  it("returns post data on 200 response", async () => {
    const mockPost = [{ id: 1, slug: "test", title: { rendered: "Test" }, excerpt: { rendered: "" } }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPost }));
    const result = await getPostBySlugForCountry("sz", "test");
    expect(result).toEqual(mockPost[0]);
  });

  it("throws an error on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(getPostBySlugForCountry("sz", "test")).rejects.toThrow("WordPress API error: 503");
  });
});

describe("getRelatedPosts", () => {
  it("returns empty array on 503 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const result = await getRelatedPosts("1", [], ["news"]);
    expect(result).toEqual([]);
  });

  it("returns posts on 200 response", async () => {
    const mockPosts = [
      { id: 2, slug: "hello", title: { rendered: "Hello" }, excerpt: { rendered: "" } },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => mockPosts }));
    const result = await getRelatedPosts("1", [], ["news"]);
    expect(result).toEqual(mockPosts);
  });
});
