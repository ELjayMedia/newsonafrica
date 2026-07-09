import { afterEach, describe, expect, it, vi } from "vitest";

import { listCategories } from "@/lib/dal/categories";
import { getPostById, getPostBySlug, listPosts, listPostsForSync } from "@/lib/dal/posts";

/** Build a fetch mock returning a WPGraphQL JSON envelope for `data`. */
function mockGraphQL(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Parse the GraphQL request body of the Nth fetch call. */
function requestBody(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return JSON.parse(init.body as string) as { query: string; variables: Record<string, unknown> };
}

const postNode = {
  databaseId: 100,
  slug: "a-story",
  date: "2026-06-01T00:00:00",
  title: "A Story",
  excerpt: "<p>Teaser</p>",
};

describe("listPosts", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("targets the country GraphQL endpoint with offset pagination and maps totals", async () => {
    const fetchMock = mockGraphQL({
      posts: { pageInfo: { offsetPagination: { total: 25 } }, nodes: [postNode] },
    });

    const result = await listPosts({ country: "za", page: 2, perPage: 10 });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://cms.test.example/za/graphql");

    const { variables } = requestBody(fetchMock);
    expect(variables).toMatchObject({ size: 10, offset: 10, categoryName: null, tagSlugs: null, authorName: null });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 100, slug: "a-story", country: "za" });
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
    expect(result.hasNextPage).toBe(true);
  });

  it("passes category/tag/author slugs through as WPGraphQL where filters", async () => {
    const fetchMock = mockGraphQL({ posts: { pageInfo: { offsetPagination: { total: 0 } }, nodes: [] } });

    await listPosts({ country: "sz", categorySlug: "news", tagSlug: "fp", authorSlug: "jane", search: "kwacha" });

    const { variables } = requestBody(fetchMock);
    expect(variables).toMatchObject({
      categoryName: "news",
      tagSlugs: ["fp"],
      authorName: "jane",
      search: "kwacha",
    });
  });
});

describe("getPostBySlug / getPostById", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns null when the post is absent", async () => {
    mockGraphQL({ post: null });
    expect(await getPostBySlug("za", "missing")).toBeNull();
  });

  it("maps a found post including content", async () => {
    mockGraphQL({ post: { ...postNode, status: "publish", content: "<p>Body</p>" } });
    const post = await getPostById("ng", 100);
    expect(post).toMatchObject({ id: 100, content: "<p>Body</p>", country: "ng" });
  });
});

describe("listPostsForSync", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns mapped posts with pagination derived from the offset total", async () => {
    mockGraphQL({
      posts: { pageInfo: { offsetPagination: { total: 120 } }, nodes: [{ ...postNode, content: "<p>Body</p>" }] },
    });

    const result = await listPostsForSync("za", { page: 1, perPage: 50 });
    expect(result.posts).toHaveLength(1);
    expect(result.total).toBe(120);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(true);
  });
});

describe("listCategories", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("maps category nodes and offset total", async () => {
    mockGraphQL({
      categories: {
        pageInfo: { offsetPagination: { total: 2 } },
        nodes: [{ databaseId: 1, name: "News", slug: "news", count: 5 }],
      },
    });

    const result = await listCategories({ country: "sz", page: 1, perPage: 10 });
    expect(result.items[0]).toEqual({ id: 1, name: "News", slug: "news", description: "", postCount: 5 });
    expect(result.total).toBe(2);
  });
});
