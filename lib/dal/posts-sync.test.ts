import { afterEach, describe, expect, it, vi } from "vitest";

import { listPostsForSync } from "@/lib/dal/posts";

function mockGraphQL(data: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const node = (id: number) => ({
  databaseId: id,
  slug: `post-${id}`,
  date: "2026-06-01T00:00:00",
  title: `Post ${id}`,
  excerpt: "<p>Teaser</p>",
  content: `<p>Body ${id}</p>`,
});

describe("listPostsForSync", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches the GraphQL read path with content and maps domain posts", async () => {
    const fetchMock = mockGraphQL({
      posts: { pageInfo: { hasNextPage: false }, nodes: [node(1), node(2)] },
    });

    const result = await listPostsForSync("za", { page: 1, perPage: 50 });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://cms.test.example/za/graphql");
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      id: 1,
      slug: "post-1",
      content: "<p>Body 1</p>",
      country: "za",
    });
    expect(result.hasNextPage).toBe(false);
  });

  it("reports hasNextPage when the connection has more or the window overflows", async () => {
    mockGraphQL({ posts: { pageInfo: { hasNextPage: true }, nodes: [node(1)] } });
    const result = await listPostsForSync("sz", { page: 1, perPage: 1 });
    expect(result.hasNextPage).toBe(true);
    expect(result.total).toBe(2);
  });

  it("walks cursors past WPGraphQL's 100-post cap (NOA-191)", async () => {
    const pages = [
      {
        pageInfo: { hasNextPage: true, endCursor: "c1" },
        nodes: Array.from({ length: 100 }, (_, i) => node(i + 1)),
      },
      {
        pageInfo: { hasNextPage: true, endCursor: "c2" },
        nodes: Array.from({ length: 100 }, (_, i) => node(i + 101)),
      },
      {
        pageInfo: { hasNextPage: false, endCursor: "c3" },
        nodes: Array.from({ length: 30 }, (_, i) => node(i + 201)),
      },
    ];
    const fetchMock = vi.fn().mockImplementation(async () => {
      const page = pages.shift();
      return new Response(JSON.stringify({ data: { posts: page } }), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Page 5 of 50 = posts 201-230: needs all three 100-post chunks.
    const result = await listPostsForSync("sz", { page: 5, perPage: 50 });
    expect(result.posts.map((p) => p.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 201));
    expect(result.hasNextPage).toBe(false);
    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    );
    expect(bodies.map((b) => b.variables.first)).toEqual([100, 100, 100]);
    expect(bodies.map((b) => b.variables.after)).toEqual([null, "c1", "c2"]);
  });

  it("throws on a GraphQL transport error so backfill can surface it", async () => {
    // 404 is a non-retryable client error, so it surfaces immediately.
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 404, statusText: "Not Found" }),
      ) as unknown as typeof fetch;
    await expect(listPostsForSync("ng")).rejects.toBeTruthy();
  });
});
