import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wordpress/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wordpress/client")>(
    "@/lib/wordpress/client",
  );

  return {
    ...actual,
    fetchWordPressGraphQL: vi.fn(),
  };
});

import * as articleData from "./article-data";

const {
  buildArticleCountryPriority,
  loadArticle,
  loadArticleWithFallback,
  normalizeCountryCode,
  ArticleTemporarilyUnavailableError,
  resetArticleCountryPriorityCache,
} = articleData;
import { fetchWordPressGraphQL } from "@/lib/wordpress/client";
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress/queries";
import { cacheTags } from "@/lib/cache";
import { CACHE_DURATIONS } from "@/lib/cache/constants";

describe("article-data", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(fetchWordPressGraphQL).mockReset();
    resetArticleCountryPriorityCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const graphqlSuccess = <T>(data: T) => ({
    ok: true as const,
    data,
    ...(data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {}),
  });

  const graphqlFailure = (message = "GraphQL fatal") => ({
    ok: false as const,
    kind: "graphql_error" as const,
    message,
    errors: [{ message }],
    error: new Error(message),
  });

  const getLastFetchOptions = () =>
    vi.mocked(fetchWordPressGraphQL).mock.calls.at(-1)?.[3] as
      | Record<string, unknown>
      | undefined;

  it("builds a minimal fallback chain for a country route", () => {
    vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
    resetArticleCountryPriorityCache();

    const priority = buildArticleCountryPriority("ng");

    expect(priority).toEqual(["ng", "sz"]);
    expect(priority.every((code) => normalizeCountryCode(code) === code)).toBe(
      true,
    );
    vi.unstubAllEnvs();
  });

  it("does not include fallback countries without an explicit GraphQL endpoint in this environment", () => {
    vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "");
    resetArticleCountryPriorityCache();

    const priority = buildArticleCountryPriority("ng");

    expect(priority).toEqual(["ng"]);
    vi.unstubAllEnvs();
  });

  it("builds a minimal fallback chain for the african route alias", () => {
    const priority = buildArticleCountryPriority("african");

    expect(priority).toEqual(["sz"]);
  });

  it("includes all supported editions only when cross-country fallback feature is enabled", () => {
    vi.stubEnv("FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK", "true");
    vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_ZA_GRAPHQL", "https://newsonafrica.com/za/graphql");
    resetArticleCountryPriorityCache();

    const priority = buildArticleCountryPriority("ng");

    expect(priority).toEqual(["ng", "sz", "za"]);
    expect(new Set(priority).size).toBe(priority.length);
    vi.unstubAllEnvs();
  });

  it("dedupes african fallback ordering when cross-post policy allows all editions", () => {
    vi.stubEnv("ARTICLE_CROSS_POST_POLICY", "all_supported");
    vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_ZA_GRAPHQL", "https://newsonafrica.com/za/graphql");
    vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
    resetArticleCountryPriorityCache();

    const priority = buildArticleCountryPriority("african");

    expect(priority).toEqual(["sz", "za", "ng"]);
    expect(new Set(priority).size).toBe(priority.length);
    vi.unstubAllEnvs();
  });

  it("reuses the cached priority for repeated calls with the same edition", () => {
    const first = buildArticleCountryPriority("za");
    const second = buildArticleCountryPriority("za");

    expect(second).toBe(first);
  });

  it("attempts to load articles for every supported wordpress country", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
        posts: {
          nodes: [
            {
              slug: "test-slug",
              id: "gid://wordpress/Post:99",
              databaseId: 99,
              date: "2024-05-01T00:00:00Z",
              title: "Nigeria title",
              excerpt: "Nigeria excerpt",
              content: "<p>Hello Nigeria</p>",
              categories: { nodes: [] },
              tags: { nodes: [] },
              author: {
                node: { databaseId: 7, name: "Reporter", slug: "reporter" },
              },
            },
          ],
        },
      }) as any,
    );

    const result = await loadArticle("ng", "test-slug");

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "test-slug", asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug("ng", "test-slug")]),
      }),
    );
    const options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("revalidate");
    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("test-slug");
    expect(result.article.databaseId).toBe(99);
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug("ng", "test-slug"),
        cacheTags.post("ng", 99),
      ]),
    );
    expect(result.canonicalCountry).toBe("ng");
    expect(result.version).toBe("2024-05-01t00-00-00z");
  });

  it("does not call wordpress when asked to load an unsupported country", async () => {
    const result = await loadArticle("african-edition", "test-slug");

    expect(result).toEqual({ status: "not_found" });
    expect(fetchWordPressGraphQL).not.toHaveBeenCalled();
  });

  it("returns the mapped article when GraphQL resolves with a node", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
        posts: {
          nodes: [
            {
              slug: "test-slug",
              id: "gid://wordpress/Post:42",
              databaseId: 42,
              date: "2024-05-01T00:00:00Z",
              title: "GraphQL title",
              excerpt: "GraphQL excerpt",
              content: "<p>Hello</p>",
              categories: { nodes: [] },
              tags: { nodes: [] },
              author: {
                node: { databaseId: 1, name: "Author", slug: "author" },
              },
            },
          ],
        },
      }) as any,
    );

    const result = await loadArticle("za", "test-slug");

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "za",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "test-slug", asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug("za", "test-slug")]),
      }),
    );
    const options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("revalidate");
    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("test-slug");
    expect(result.article.databaseId).toBe(42);
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug("za", "test-slug"),
        cacheTags.post("za", 42),
      ]),
    );
    expect(result.canonicalCountry).toBe("za");
    expect(result.version).toBe("2024-05-01t00-00-00z");
  });



  it("prefers result.post for non-preview requests when posts nodes are empty", async () => {
    const postNode = {
      slug: "post-only-slug",
      id: "gid://wordpress/Post:888",
      databaseId: 888,
      date: "2024-05-01T00:00:00Z",
      title: "Post-only title",
      excerpt: "Post-only excerpt",
      content: "<p>Post-only content</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 5, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: postNode, posts: { nodes: [null] } }) as any,
    );

    const result = await loadArticle("ng", "post-only-slug", false);

    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("post-only-slug");
    expect(result.article.databaseId).toBe(888);
    expect(result.article.title).toContain("Post-only title");
  });

  it("uses result.post over posts.nodes when both are present", async () => {
    const preferredPostNode = {
      slug: "post-preferred-slug",
      id: "gid://wordpress/Post:1001",
      databaseId: 1001,
      date: "2024-05-01T00:00:00Z",
      title: "Preferred post title",
      excerpt: "Preferred post excerpt",
      content: "<p>Preferred post body</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 9, name: "Reporter", slug: "reporter" } },
    };

    const fallbackPostsNode = {
      slug: "posts-node-slug",
      id: "gid://wordpress/Post:1002",
      databaseId: 1002,
      date: "2024-05-01T00:00:00Z",
      title: "Fallback posts title",
      excerpt: "Fallback posts excerpt",
      content: "<p>Fallback posts body</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 10, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
        post: preferredPostNode,
        posts: { nodes: [fallbackPostsNode] },
      }) as any,
    );

    const result = await loadArticle("ng", "post-preferred-slug", false);

    expect(result.status).toBe("found");
    expect(result.article.databaseId).toBe(1001);
    expect(result.article.slug).toBe("post-preferred-slug");
    expect(result.article.title).toContain("Preferred post title");
  });
  it("returns null when GraphQL returns no nodes", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [] } }) as any,
    );

    const result = await loadArticle("za", "missing-slug");

    expect(result).toEqual({ status: "not_found" });
  });

  it("returns a temporary error when GraphQL fails", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(graphqlFailure() as any);

    const result = await loadArticle("za", "test-slug");

    expect(result.status).toBe("temporary_error");
    expect(result.error).toBeInstanceOf(Error);
    expect(result.failure).toMatchObject({
      kind: "graphql_error",
      message: "GraphQL fatal",
    });
  });

  it("requests preview content when preview mode is enabled", async () => {
    const node = {
      slug: "preview-slug",
      id: "gid://wordpress/Post:777",
      databaseId: 777,
      date: "2024-05-01T00:00:00Z",
      title: "Preview title",
      excerpt: "Preview excerpt",
      content: "<p>Preview</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 5, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    );

    const result = await loadArticle("ng", "preview-slug", true);

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "preview-slug", asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    );
    const options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("tags");
    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("preview-slug");
  });

  it("fetches from wordpress when no cached article exists", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [] } }) as any,
    );

    await loadArticleWithFallback("uncached", ["ng"]);

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "uncached", asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug("ng", "uncached")]),
      }),
    );
    const options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("revalidate");
  });

  it("does not cache preview articles when loading with fallback", async () => {
    const node = {
      slug: "preview-slug",
      id: "gid://wordpress/Post:555",
      databaseId: 555,
      date: "2024-05-01T00:00:00Z",
      title: "Preview title",
      excerpt: "Preview excerpt",
      content: "<p>Preview</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 11, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    );

    await loadArticleWithFallback("preview-slug", ["ng"], true);

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "preview-slug", asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    );
    let options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("tags");

    vi.mocked(fetchWordPressGraphQL).mockClear();
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    );

    await loadArticleWithFallback("preview-slug", ["ng"], true);

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "preview-slug", asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    );
    options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("tags");
  });

  it("queries wordpress again for repeated requests (no persistent stale cache)", async () => {
    const node = {
      slug: "cached-slug",
      id: "gid://wordpress/Post:222",
      databaseId: 222,
      date: "2024-05-01T00:00:00Z",
      title: "Cached title",
      excerpt: "Cached excerpt",
      content: "<p>Cached</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 12, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [node] } }) as any,
    );

    await loadArticleWithFallback("cached-slug", ["ng"]);

    vi.mocked(fetchWordPressGraphQL).mockClear();

    const result = await loadArticleWithFallback("cached-slug", ["ng"]);

    expect(fetchWordPressGraphQL).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("cached-slug");
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug("ng", "cached-slug"),
        cacheTags.post("ng", 222),
      ]),
    );
    expect(result.sourceCountry).toBe("ng");
    expect(result.canonicalCountry).toBe("ng");
    expect(result.version).toBe("2024-05-01t00-00-00z");
  });

  it("queries each fallback country in order when earlier countries return no article", async () => {
    const fallbackNode = {
      slug: "cached-slug",
      id: "gid://wordpress/Post:333",
      databaseId: 333,
      date: "2024-05-01T00:00:00Z",
      title: "Fallback title",
      excerpt: "Fallback excerpt",
      content: "<p>Fallback</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 18, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
      if (country === "ng") {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any;
      }

      if (country === "za") {
        return Promise.resolve(
          graphqlSuccess({ posts: { nodes: [fallbackNode] } }),
        ) as any;
      }

      throw new Error(`Unexpected country: ${country}`);
    });

    const result = await loadArticleWithFallback("cached-slug", ["ng", "za"]);

    expect(fetchWordPressGraphQL).toHaveBeenCalledTimes(2);
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      1,
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "cached-slug", asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug("ng", "cached-slug")]),
      }),
    );
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      2,
      "za",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "cached-slug", asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug("za", "cached-slug")]),
      }),
    );
    const options = getLastFetchOptions();
    expect(options).toBeDefined();
    expect(options).not.toHaveProperty("revalidate");
    expect(result.status).toBe("found");
    expect(result.article.slug).toBe("cached-slug");
    expect(result.sourceCountry).toBe("za");
    expect(result.canonicalCountry).toBe("za");
    expect(result.version).toBe("2024-05-01t00-00-00z");
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug("za", "cached-slug"),
        cacheTags.post("za", 333),
      ]),
    );
  });

  it("returns the first successful article by priority order", async () => {
    const zaNode = {
      slug: "priority-slug",
      id: "gid://wordpress/Post:404",
      databaseId: 404,
      date: "2024-05-01T00:00:00Z",
      title: "ZA title",
      excerpt: "ZA excerpt",
      content: "<p>ZA body</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 17, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockImplementation((countryCode) => {
      if (countryCode === "ng") {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any;
      }

      if (countryCode === "za") {
        return Promise.resolve(
          graphqlSuccess({ posts: { nodes: [zaNode] } }),
        ) as any;
      }

      throw new Error(`Unexpected country: ${countryCode}`);
    });

    const result = await loadArticleWithFallback("priority-slug", [
      "ng",
      "za",
      "ke",
    ]);

    expect(fetchWordPressGraphQL).toHaveBeenCalledTimes(2);
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      1,
      "ng",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "priority-slug", asPreview: false }),
      expect.any(Object),
    );
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      2,
      "za",
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: "priority-slug", asPreview: false }),
      expect.any(Object),
    );
    expect(result.status).toBe("found");
    expect(result.sourceCountry).toBe("za");
    expect(result.article.slug).toBe("priority-slug");
    expect(result.canonicalCountry).toBe("za");
    expect(result.version).toBe("2024-05-01t00-00-00z");
  });

  it("aggregates temporary failures when every country encounters an error", async () => {
    const errorNg = new Error("ng outage");
    const zaHttpFailure = {
      ok: false as const,
      kind: "http_error" as const,
      message: "WordPress GraphQL request failed with status 503",
      status: 503,
      statusText: "Service Unavailable",
      response: new Response(null, {
        status: 503,
        statusText: "Service Unavailable",
      }),
      error: new Error("WordPress GraphQL request failed with status 503"),
    };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
      if (country === "ng") {
        return Promise.reject(errorNg);
      }

      if (country === "za") {
        return Promise.resolve(zaHttpFailure as any);
      }

      return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any;
    });

    const result = await loadArticleWithFallback("slug", ["ng", "za"], false, {
      requestedCountry: "african",
      staleCacheServed: true,
    });

    expect(result.status).toBe("temporary_error");
    expect(result.error).toBeInstanceOf(ArticleTemporarilyUnavailableError);
    expect(result.error.errors).toEqual(
      expect.arrayContaining([errorNg, zaHttpFailure.error]),
    );
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ country: "ng", error: errorNg }),
        expect.objectContaining({
          country: "za",
          error: zaHttpFailure.error,
          failure: expect.objectContaining({ kind: "http_error", status: 503 }),
        }),
      ]),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[article-data] fallback attempts exhausted with temporary failures",
      expect.objectContaining({
        slug: "slug",
        requestedCountry: "african",
        countryPriority: ["ng", "za"],
        staleCacheServed: true,
        attempts: [
          {
            country: "ng",
            result: "temporary_error",
            failureKind: null,
            failureStatus: null,
          },
          {
            country: "za",
            result: "temporary_error",
            failureKind: "http_error",
            failureStatus: 503,
          },
        ],
      }),
    );
    expect(result).not.toHaveProperty("staleCanonicalCountry");
    consoleErrorSpy.mockRestore();
  });
  it("returns temporary_error for 5xx even when a prior successful fetch exists", async () => {
    const cachedNode = {
      slug: "stale-slug",
      id: "gid://wordpress/Post:75",
      databaseId: 75,
      date: "2024-05-01T00:00:00Z",
      title: "Cached headline",
      excerpt: "<p>Cached summary</p>",
      content: "<p>Body</p>",
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 3, name: "Reporter", slug: "reporter" } },
    };

    vi.mocked(fetchWordPressGraphQL).mockResolvedValueOnce(
      graphqlSuccess({ posts: { nodes: [cachedNode] } }) as any,
    );

    await loadArticleWithFallback("stale-slug", ["ng"]);

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      ok: false,
      kind: "http_error",
      message: "WordPress GraphQL request failed with status 503",
      status: 503,
      statusText: "Service Unavailable",
      response: new Response(null, {
        status: 503,
        statusText: "Service Unavailable",
      }),
      error: new Error("WordPress GraphQL request failed with status 503"),
    } as any);

    const result = await loadArticleWithFallback("stale-slug", ["ng"]);

    expect(result.status).toBe("temporary_error");
    expect(result).not.toHaveProperty("staleArticle");
    expect(result).not.toHaveProperty("staleSourceCountry");
    expect(result).not.toHaveProperty("staleCanonicalCountry");
  });

  it("continues fallbacks when some countries temporarily fail", async () => {
    const temporaryError = new Error("ng outage");

    vi.mocked(fetchWordPressGraphQL).mockImplementation(
      (country, _query, variables) => {
        if (country === "ng") {
          return Promise.reject(temporaryError);
        }

        if (country === "za") {
          return Promise.resolve(
            graphqlSuccess({
              posts: {
                nodes: [
                  {
                    slug: (variables as { slug: string }).slug,
                    id: "gid://wordpress/Post:55",
                    databaseId: 55,
                    date: "2024-05-01T00:00:00Z",
                    title: "Recovered",
                    excerpt: "Recovered excerpt",
                    content: "<p>Recovered</p>",
                    categories: { nodes: [] },
                    tags: { nodes: [] },
                    author: {
                      node: {
                        databaseId: 4,
                        name: "Reporter",
                        slug: "reporter",
                      },
                    },
                  },
                ],
              },
            }),
          ) as any;
        }

        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any;
      },
    );

    const result = await loadArticleWithFallback("slug", ["ng", "za"]);

    expect(result.status).toBe("found");
    expect(result.sourceCountry).toBe("za");
    expect(result.article.slug).toBe("slug");
    expect(result.canonicalCountry).toBe("za");
    expect(result.version).toBe("2024-05-01t00-00-00z");
  });

  it("returns temporary_error for 5xx when no prior successful fetch exists", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      ok: false,
      kind: "http_error",
      message: "WordPress GraphQL request failed with status 503",
      status: 503,
      statusText: "Service Unavailable",
      response: new Response(null, {
        status: 503,
        statusText: "Service Unavailable",
      }),
      error: new Error("WordPress GraphQL request failed with status 503"),
    } as any);

    const result = await loadArticleWithFallback("stale-slug", ["ng"]);

    expect(result.status).toBe("temporary_error");
    expect(result).not.toHaveProperty("staleArticle");
    expect(result).not.toHaveProperty("staleSourceCountry");
    expect(result).not.toHaveProperty("staleCanonicalCountry");
  });
});
