import { afterEach, describe, expect, it, vi } from "vitest";

import { getExistingPostSlugs } from "@/lib/dal/posts";

function mockGraphQL(data: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("getExistingPostSlugs", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the slugs the edition's CMS still publishes", async () => {
    const fetchMock = mockGraphQL({
      posts: { nodes: [{ slug: "a" }, { slug: null }, { slug: "c" }] },
    });

    const slugs = await getExistingPostSlugs("sz", ["a", "lost", "c"]);

    expect(slugs).toEqual(new Set(["a", "c"]));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://cms.test.example/sz/graphql");
    expect(JSON.parse(String(init.body)).variables).toEqual({
      slugs: ["a", "lost", "c"],
      first: 3,
    });
  });

  it("skips the CMS call when there are no slugs", async () => {
    const fetchMock = mockGraphQL({ posts: { nodes: [] } });

    await expect(getExistingPostSlugs("sz", [])).resolves.toEqual(new Set());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a response without posts as none existing", async () => {
    mockGraphQL({});

    await expect(getExistingPostSlugs("sz", ["a"])).resolves.toEqual(new Set());
  });
});
