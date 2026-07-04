import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWordPressRest, fetchWordPressRestList, WordPressRestError } from "@/lib/wordpress/rest-client";

describe("fetchWordPressRest", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("builds the country-scoped URL with query params and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1, slug: "hello" }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchWordPressRest<{ id: number; slug: string }>("za", "posts/1", {
      params: { _embed: true },
    });

    expect(result).toEqual({ id: 1, slug: "hello" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://cms.test.example/za/wp-json/wp/v2/posts/1?_embed=true");
  });

  it("throws WordPressRestError on a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("not found", { status: 404, statusText: "Not Found" })) as unknown as typeof fetch;

    await expect(fetchWordPressRest("sz", "posts/999")).rejects.toBeInstanceOf(WordPressRestError);
  });

  it("parses X-WP-Total / X-WP-TotalPages pagination headers for list results", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), {
        status: 200,
        headers: { "X-WP-Total": "42", "X-WP-TotalPages": "5" },
      }),
    ) as unknown as typeof fetch;

    const result = await fetchWordPressRestList<{ id: number }>("ng", "posts");

    expect(result.items).toHaveLength(2);
    expect(result.pageInfo).toEqual({ total: 42, totalPages: 5 });
  });
});
