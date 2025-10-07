import { afterEach, describe, expect, it, vi } from "vitest"

import type { AggregatedHomeData } from "@/lib/wordpress-api"

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
