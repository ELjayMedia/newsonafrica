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
import { cacheTags } from "@/lib/cache/cacheTags";
import { CACHE_DURATIONS } from "@/lib/cache/constants";
import { fetchWordPressGraphQL } from "@/lib/wordpress/client";
import { POST_BY_SLUG_QUERY } from "@/lib/wordpress/queries";

const {
  ArticleTemporarilyUnavailableError,
  buildArticleCountryPriority,
  loadArticle,
  loadArticleWithFallback,
  normalizeCountryCode,
  resetArticleCountryPriorityCache,
} = articleData;

type PostNode = {
  slug: string;
  id: string;
  databaseId: number;
  date: string;
  title: string;
  excerpt: string;
  content: string;
  categories: { nodes: unknown[] };
  tags: { nodes: unknown[] };
  author: { node: { databaseId: number; name: string; slug: string } };
};

const buildPostNode = (overrides: Partial<PostNode> = {}): PostNode => ({
  slug: "test-slug",
  id: "gid://wordpress/Post:99",
  databaseId: 99,
  date: "2024-05-01T00:00:00Z",
  title: "Test title",
  excerpt: "Test excerpt",
  content: "<p>Test body</p>",
  categories: { nodes: [] },
  tags: { nodes: [] },
  author: { node: { databaseId: 7, name: "Reporter", slug: "reporter" } },
  ...overrides,
});

const graphqlSuccess = <T>(data: T) => ({
  ok: true as const,
  data,
  ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
});

const graphqlFailure = (message = "GraphQL fatal") => ({
  ok: false as const,
  kind: "graphql_error" as const,
  message,
  errors: [{ message }],
  error: new Error(message),
});

const expectFound = <T extends { status: string }>(result: T): Extract<T, { status: "found" }> => {
  expect(result.status).toBe("found");

  if (result.status !== "found") {
    throw new Error(`Expected found article result, received ${result.status}`);
  }

  return result as Extract<T, { status: "found" }>;
};

const setArticleFallbackEnv = (options: {
  crossCountryFallback?: boolean;
  crossPostPolicy?: "all_supported" | "";
  endpoints?: Partial<Record<"ng" | "sz" | "za", string>>;
} = {}) => {
  vi.stubEnv(
    "FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK",
    options.crossCountryFallback ? "true" : "false",
  );
  vi.stubEnv("ARTICLE_CROSS_POST_POLICY", options.crossPostPolicy ?? "");

  const endpoints = options.endpoints ?? {};
  vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", endpoints.ng ?? "");
  vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", endpoints.sz ?? "");
  vi.stubEnv("NEXT_PUBLIC_WP_ZA_GRAPHQL", endpoints.za ?? "");

  resetArticleCountryPriorityCache();
};

describe("article-data", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(fetchWordPressGraphQL).mockReset();
    resetArticleCountryPriorityCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    resetArticleCountryPriorityCache();
  });

  const getLastFetchOptions = () =>
    vi.mocked(fetchWordPressGraphQL).mock.calls.at(-1)?.[3] as
      | Record<string, unknown>
      | undefined;

  describe("country fallback priority", () => {
    it("uses the requested country first and then the configured default site", () => {
      setArticleFallbackEnv({
        endpoints: {
          ng: "https://newsonafrica.com/ng/graphql",
          sz: "https://newsonafrica.com/sz/graphql",
        },
      });

      const priority = buildArticleCountryPriority("ng");

      expect(priority).toEqual(["ng", "sz"]);
      expect(priority.every((code) => normalizeCountryCode(code) === code)).toBe(true);
    });

    it("filters fallback countries that do not have a configured GraphQL endpoint", () => {
      setArticleFallbackEnv({
        endpoints: {
          ng: "https://newsonafrica.com/ng/graphql",
          sz: "",
          za: "",
        },
      });

      const priority = buildArticleCountryPriority("ng");

      expect(priority).toEqual(["ng"]);
    });

    it("maps the African route alias to the default WordPress-backed edition", () => {
      setArticleFallbackEnv({
        endpoints: {
          sz: "https://newsonafrica.com/sz/graphql",
        },
      });

      const priority = buildArticleCountryPriority("african");

      expect(priority).toEqual(["sz"]);
    });

    it("includes configured country editions when cross-country fallback is enabled", () => {
      setArticleFallbackEnv({
        crossCountryFallback: true,
        endpoints: {
          ng: "https://newsonafrica.com/ng/graphql",
          sz: "https://newsonafrica.com/sz/graphql",
          za: "https://newsonafrica.com/za/graphql",
        },
      });

      const priority = buildArticleCountryPriority("ng");

      expect(priority).toEqual(["ng", "sz", "za"]);
      expect(new Set(priority).size).toBe(priority.length);
    });

    it("dedupes African fallback ordering when cross-post policy allows all editions", () => {
      setArticleFallbackEnv({
        crossPostPolicy: "all_supported",
        endpoints: {
          sz: "https://newsonafrica.com/sz/graphql",
          za: "https://newsonafrica.com/za/graphql",
          ng: "https://newsonafrica.com/ng/graphql",
        },
      });

      const priority = buildArticleCountryPriority("african");

      expect(priority).toEqual(["sz", "za", "ng"]);
      expect(new Set(priority).size).toBe(priority.length);
    });

    it("reuses the cached priority for repeated calls with the same edition and env signature", () => {
      setArticleFallbackEnv({
        endpoints: {
          za: "https://newsonafrica.com/za/graphql",
          sz: "https://newsonafrica.com/sz/graphql",
        },
      });

      const first = buildArticleCountryPriority("za");
      const second = buildArticleCountryPriority("za");

      expect(second).toBe(first);
    });
  });

  describe("single-country article loading", () => {
    it("loads and maps a WordPress article by slug", async () => {
      const node = buildPostNode({
        slug: "test-slug",
        databaseId: 42,
        id: "gid://wordpress/Post:42",
        title: "GraphQL title",
      });

      vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
        graphqlSuccess({ posts: { nodes: [node] } }),
      );

      const result = expectFound(await loadArticle("za", "test-slug"));

      expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
        "za",
        POST_BY_SLUG_QUERY,
        expect.objectContaining({ slug: "test-slug", asPreview: false }),
        expect.objectContaining({
          tags: expect.arrayContaining([cacheTags.postSlug("za", "test-slug")]),
        }),
      );
      expect(getLastFetchOptions()).not.toHaveProperty("revalidate");
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

    it("prefers result.post over posts.nodes when both are present", async () => {
      const preferredPostNode = buildPostNode({
        slug: "post-preferred-slug",
        id: "gid://wordpress/Post:1001",
        databaseId: 1001,
        title: "Preferred post title",
      });
      const fallbackPostsNode = buildPostNode({
        slug: "posts-node-slug",
        id: "gid://wordpress/Post:1002",
        databaseId: 1002,
        title: "Fallback posts title",
      });

      vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
        graphqlSuccess({ post: preferredPostNode, posts: { nodes: [fallbackPostsNode] } }),
      );

      const result = expectFound(await loadArticle("ng", "post-preferred-slug", false));

      expect(result.article.databaseId).toBe(1001);
      expect(result.article.slug).toBe("post-preferred-slug");
      expect(result.article.title).toContain("Preferred post title");
    });

    it("returns not_found when GraphQL returns no post node", async () => {
      vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
        graphqlSuccess({ post: null, posts: { nodes: [] } }),
      );

      await expect(loadArticle("za", "missing-slug")).resolves.toEqual({
        status: "not_found",
      });
    });

    it("returns temporary_error when GraphQL fails", async () => {
      vi.mocked(fetchWordPressGraphQL).mockResolvedValue(graphqlFailure());

      const result = await loadArticle("za", "test-slug");

      expect(result.status).toBe("temporary_error");
      expect(result.error).toBeInstanceOf(Error);
      expect(result.failure).toMatchObject({
        kind: "graphql_error",
        message: "GraphQL fatal",
      });
    });

    it("requests preview content without cache tags when preview mode is enabled", async () => {
      const node = buildPostNode({ slug: "preview-slug", databaseId: 777 });

      vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
        graphqlSuccess({ post: node, posts: { nodes: [] } }),
      );

      const result = expectFound(await loadArticle("ng", "preview-slug", true));

      expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
        "ng",
        POST_BY_SLUG_QUERY,
        expect.objectContaining({ slug: "preview-slug", asPreview: true }),
        expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
      );
      expect(getLastFetchOptions()).not.toHaveProperty("tags");
      expect(result.article.slug).toBe("preview-slug");
    });
  });

  describe("article loading with fallback", () => {
    it("queries each fallback country in order until an article is found", async () => {
      const fallbackNode = buildPostNode({
        slug: "fallback-slug",
        id: "gid://wordpress/Post:333",
        databaseId: 333,
        title: "Fallback title",
      });

      vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
        if (country === "ng") {
          return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } }));
        }

        if (country === "za") {
          return Promise.resolve(graphqlSuccess({ posts: { nodes: [fallbackNode] } }));
        }

        throw new Error(`Unexpected country: ${country}`);
      });

      const result = expectFound(await loadArticleWithFallback("fallback-slug", ["ng", "za"]));

      expect(fetchWordPressGraphQL).toHaveBeenCalledTimes(2);
      expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
        1,
        "ng",
        POST_BY_SLUG_QUERY,
        expect.objectContaining({ slug: "fallback-slug", asPreview: false }),
        expect.objectContaining({
          tags: expect.arrayContaining([cacheTags.postSlug("ng", "fallback-slug")]),
        }),
      );
      expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
        2,
        "za",
        POST_BY_SLUG_QUERY,
        expect.objectContaining({ slug: "fallback-slug", asPreview: false }),
        expect.objectContaining({
          tags: expect.arrayContaining([cacheTags.postSlug("za", "fallback-slug")]),
        }),
      );
      expect(result.sourceCountry).toBe("za");
      expect(result.canonicalCountry).toBe("za");
      expect(result.tags).toEqual(
        expect.arrayContaining([
          cacheTags.postSlug("za", "fallback-slug"),
          cacheTags.post("za", 333),
        ]),
      );
    });

    it("continues to a later fallback country after a temporary failure", async () => {
      const temporaryError = new Error("ng outage");
      const recoveredNode = buildPostNode({
        slug: "slug",
        id: "gid://wordpress/Post:55",
        databaseId: 55,
        title: "Recovered",
      });

      vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
        if (country === "ng") {
          return Promise.reject(temporaryError);
        }

        if (country === "za") {
          return Promise.resolve(graphqlSuccess({ posts: { nodes: [recoveredNode] } }));
        }

        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } }));
      });

      const result = expectFound(await loadArticleWithFallback("slug", ["ng", "za"]));

      expect(result.sourceCountry).toBe("za");
      expect(result.article.slug).toBe("slug");
      expect(result.canonicalCountry).toBe("za");
    });

    it("aggregates temporary failures when every attempted country fails", async () => {
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
          return Promise.resolve(zaHttpFailure);
        }

        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } }));
      });

      const result = await loadArticleWithFallback("slug", ["ng", "za"], false, {
        requestedCountry: "african",
        staleCacheServed: true,
      });

      expect(result.status).toBe("temporary_error");

      if (result.status !== "temporary_error") {
        throw new Error(`Expected temporary_error, received ${result.status}`);
      }

      expect(result.error).toBeInstanceOf(ArticleTemporarilyUnavailableError);
      expect(result.error.errors).toEqual(expect.arrayContaining([errorNg, zaHttpFailure.error]));
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
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it("returns temporary_error for 5xx when no fallback succeeds", async () => {
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
      });

      const result = await loadArticleWithFallback("stale-slug", ["ng"]);

      expect(result.status).toBe("temporary_error");
      expect(result).not.toHaveProperty("staleArticle");
      expect(result).not.toHaveProperty("staleSourceCountry");
      expect(result).not.toHaveProperty("staleCanonicalCountry");
    });
  });
});
