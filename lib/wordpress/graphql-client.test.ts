import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWordPressGraphQL } from "@/lib/wordpress/graphql-client";

describe("fetchWordPressGraphQL", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns ok:true with typed data on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { post: { slug: "hello" } } }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await fetchWordPressGraphQL<{ post: { slug: string } }>("za", "query { post { slug } }");

    expect(result).toEqual({ ok: true, data: { post: { slug: "hello" } } });
  });

  it("returns an http_error result for a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 502, statusText: "Bad Gateway" })) as unknown as typeof fetch;

    const result = await fetchWordPressGraphQL("sz", "query { post { slug } }");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("http_error");
    }
  });

  it("returns a graphql_error result when the response contains errors", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "Cannot query field" }] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await fetchWordPressGraphQL("ng", "query { bogus }");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("graphql_error");
      if (result.kind === "graphql_error") {
        expect(result.errors[0]?.message).toBe("Cannot query field");
      }
    }
  });

  it("returns an invalid_payload result when the body is not JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("<html>not json</html>", { status: 200 })) as unknown as typeof fetch;

    const result = await fetchWordPressGraphQL("sz", "query { post { slug } }");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("invalid_payload");
    }
  });

  it("sends the query, variables and operationName in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchWordPressGraphQL("za", "query PostBySlug($slug: ID!) { post(id: $slug) { slug } }", { slug: "hello" }, {
      operationName: "PostBySlug",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://cms.test.example/za/graphql");
    const body = JSON.parse(init.body as string);
    expect(body.variables).toEqual({ slug: "hello" });
    expect(body.operationName).toBe("PostBySlug");
  });
});
