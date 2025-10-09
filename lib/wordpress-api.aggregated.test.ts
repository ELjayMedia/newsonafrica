import { afterEach, describe, expect, it, vi } from "vitest"

import * as wordpressApi from "@/lib/wordpress-api"

describe("getAggregatedLatestHome", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("dedupes posts with identical relay ids across countries", async () => {
    const relayId = "relay-123"
    const capturedRequests: Array<{ variables?: { tagSlugs?: string[] } }> = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url.endsWith("/graphql")) {
        if (init?.body && typeof init.body === "string") {
          capturedRequests.push(JSON.parse(init.body) as { variables?: { tagSlugs?: string[] } })
        }

        return new Response(
          JSON.stringify({
            data: {
              posts: {
                nodes: [
                  {
                    __typename: "Post",
                    databaseId: 1,
                    id: relayId,
                    slug: "shared-slug",
                    date: "2024-05-01T00:00:00Z",
                    title: "Shared post",
                    excerpt: "Shared excerpt",
                    featuredImage: { node: null },
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      return new Response(null, { status: 404 })
    })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const result = await wordpressApi.getAggregatedLatestHome(1)

    expect(result.heroPost).not.toBeNull()
    expect(result.heroPost?.globalRelayId).toBe(relayId)
    expect(result.secondaryPosts).toHaveLength(0)
    expect(result.remainingPosts).toHaveLength(0)

    const aggregatedPosts = [
      result.heroPost,
      ...result.secondaryPosts,
      ...result.remainingPosts,
    ].filter((post): post is NonNullable<typeof post> => Boolean(post))

    expect(aggregatedPosts).toHaveLength(1)

    expect(capturedRequests).not.toHaveLength(0)
    capturedRequests.forEach((request) => {
      expect(request.variables?.tagSlugs).toEqual(["fp"])
    })
  })
})
