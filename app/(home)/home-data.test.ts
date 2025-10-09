import { afterEach, describe, expect, it, vi } from "vitest"

import type { AggregatedHomeData } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

const BASE_URL = "https://example.com"
const CACHE_TAGS = ["section:home-feed"]

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("fetchAggregatedHome", () => {
  it("falls back to WordPress aggregation when the API request fails", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))

    const fallbackData: AggregatedHomeData = {
      heroPost: null,
      secondaryPosts: [],
      remainingPosts: [],
    }

    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"))
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const wordpressApi = await import("@/lib/wordpress-api")
    const fallbackSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockResolvedValue(fallbackData)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS)

    expect(result).toBe(fallbackData)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fallbackSpy).toHaveBeenCalledTimes(1)
  })

  it("deduplicates requests so the fallback aggregation only runs once per render", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))

    const fallbackData: AggregatedHomeData = {
      heroPost: null,
      secondaryPosts: [],
      remainingPosts: [],
    }

    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"))
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const wordpressApi = await import("@/lib/wordpress-api")
    const fallbackSpy = vi
      .spyOn(wordpressApi, "getAggregatedLatestHome")
      .mockResolvedValue(fallbackData)

    const homeDataModule = await import("./home-data")

    const [first, second] = await Promise.all([
      homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS),
      homeDataModule.fetchAggregatedHome(BASE_URL, CACHE_TAGS),
    ])

    expect(first).toBe(fallbackData)
    expect(second).toBe(fallbackData)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fallbackSpy).toHaveBeenCalledTimes(1)
  })
})

describe("fetchAggregatedHomeForCountry", () => {
  it("retrieves fp-tagged posts for the requested country", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))

    const posts: HomePost[] = [
      {
        id: "1",
        globalRelayId: "gid://shared/1",
        slug: "story-one",
        title: "Story one",
        excerpt: "Excerpt one",
        date: "2024-05-01T00:00:00Z",
      },
      {
        id: "2",
        slug: "story-two",
        title: "Story two",
        excerpt: "Excerpt two",
        date: "2024-05-02T00:00:00Z",
      },
      {
        id: "3",
        slug: "story-three",
        title: "Story three",
        excerpt: "Excerpt three",
        date: "2024-05-03T00:00:00Z",
      },
      {
        id: "4",
        slug: "story-four",
        title: "Story four",
        excerpt: "Excerpt four",
        date: "2024-05-04T00:00:00Z",
      },
    ]

    const wordpressApi = await import("@/lib/wordpress-api")
    const fpSpy = vi
      .spyOn(wordpressApi, "getFpTaggedPostsForCountry")
      .mockResolvedValue(posts)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 4)

    expect(fpSpy).toHaveBeenCalledWith("za", 4)
    expect(result.heroPost).toEqual(posts[0])
    expect(result.secondaryPosts).toEqual(posts.slice(1, 4))
    expect(result.remainingPosts).toEqual([])
  })

  it("uses the REST fallback when GraphQL returns no fp-tagged posts", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))

    const restPosts = [
      {
        id: 1,
        slug: "fp-older",
        title: { rendered: "Older story" },
        excerpt: { rendered: "Older excerpt" },
        content: { rendered: "<p>Older content</p>" },
        date: "2024-05-01T00:00:00Z",
        _embedded: { "wp:featuredmedia": [] },
      },
      {
        id: 2,
        slug: "fp-newer",
        title: { rendered: "Newer story" },
        excerpt: { rendered: "Newer excerpt" },
        content: { rendered: "<p>Newer content</p>" },
        date: "2024-05-02T00:00:00Z",
        _embedded: { "wp:featuredmedia": [] },
      },
    ]

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url.endsWith("/graphql")) {
        return new Response(
          JSON.stringify({ data: { posts: { nodes: [] } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      if (url.includes("/tags")) {
        return new Response(JSON.stringify([{ id: 500, name: "Front Page", slug: "fp" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (url.includes("/posts")) {
        return new Response(JSON.stringify(restPosts), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      throw new Error(`Unexpected fetch to ${url}`)
    })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const homeDataModule = await import("./home-data")
    const result = await homeDataModule.fetchAggregatedHomeForCountry("za", 2)

    expect(fetchMock).toHaveBeenCalled()
    expect(result.heroPost?.slug).toBe("fp-older")
    expect(result.secondaryPosts).toHaveLength(1)
    expect(result.secondaryPosts[0].slug).toBe("fp-newer")
    expect(result.remainingPosts).toEqual([])
  })
})
