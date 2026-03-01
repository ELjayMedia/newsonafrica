import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock('server-only', () => ({}))

vi.mock("@/config/env", () => ({
  ENV: {
    NEXT_PUBLIC_DEFAULT_SITE: "sz",
  },
}))

vi.mock("@/lib/wordpress/editions-registry", () => ({
  WORDPRESS_EDITIONS_REGISTRY: {
    sz: { graphql: "https://example.com/sz/graphql" },
    za: { graphql: "https://example.com/za/graphql" },
    ng: { graphql: "https://example.com/ng/graphql" },
  },
}))

vi.mock("@/lib/mapping/post-mappers.server", () => ({
  mapGraphqlPostToWordPressPost: vi.fn((node: any, countryCode?: string) => ({
    ...node,
    countryCode,
  })),
}))

vi.mock("@/lib/wordpress/client", () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

import { fetchWordPressGraphQL } from "@/lib/wordpress/client"
import { getArticleBySlug } from "@/lib/wordpress/article-data"
import {
  POST_BY_DATABASE_ID_QUERY,
  POST_BY_SLUG_DIRECT_QUERY,
} from "@/lib/wordpress/queries"

const graphqlSuccess = <T,>(data: T) => ({
  ok: true as const,
  data,
  ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
})

describe("getArticleBySlug", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("uses database-id query for numeric-suffix routes", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
        post: {
          databaseId: 123,
          slug: "story",
          date: "2025-01-01T00:00:00Z",
          title: "Story",
          excerpt: "",
        },
      }) as any,
    )

    const result = await getArticleBySlug({ countryCode: "sz", slug: "story-123" })

    expect(result.status).toBe("found")
    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "sz",
      POST_BY_DATABASE_ID_QUERY,
      { id: 123, asPreview: false },
      expect.any(Object),
    )
  })

  it("returns found from direct slug query", async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
        post: {
          databaseId: 77,
          slug: "slug-only",
          date: "2025-01-01T00:00:00Z",
          title: "Slug story",
          excerpt: "",
        },
      }) as any,
    )

    const result = await getArticleBySlug({ countryCode: "sz", slug: "slug-only" })

    expect(result.status).toBe("found")
    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      "sz",
      POST_BY_SLUG_DIRECT_QUERY,
      { slug: "slug-only", asPreview: false },
      expect.any(Object),
    )
  })

  it("does not escalate GraphQL schema errors to temporary_error when direct slug lookup can continue", async () => {
    vi.mocked(fetchWordPressGraphQL)
      .mockResolvedValueOnce({
        ok: false,
        kind: "graphql_error",
        message: "Cannot query field \"posts\"",
        errors: [{ message: "Cannot query field \"posts\"" }],
        error: new Error("Cannot query field \"posts\""),
      } as any)
      .mockResolvedValueOnce(
        graphqlSuccess({
          post: {
            databaseId: 9,
            slug: "slug-fallback",
            date: "2025-01-01T00:00:00Z",
            title: "Fallback",
            excerpt: "",
          },
        }) as any,
      )

    const result = await getArticleBySlug({ countryCode: "sz", slug: "slug-fallback" })

    expect(result.status).toBe("found")
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      1,
      "sz",
      POST_BY_SLUG_DIRECT_QUERY,
      { slug: "slug-fallback", asPreview: false },
      expect.any(Object),
    )
    expect(fetchWordPressGraphQL).toHaveBeenNthCalledWith(
      2,
      "za",
      POST_BY_SLUG_DIRECT_QUERY,
      { slug: "slug-fallback", asPreview: false },
      expect.any(Object),
    )
  })
})
