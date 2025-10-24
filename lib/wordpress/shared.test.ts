import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { CACHE_DURATIONS } from "../cache/constants"
import * as graphqlClient from "./client"
import * as restClient from "./rest-client"
import { getFpTagForCountry, invalidateFpTagCache } from "./shared"
import type { WordPressTag } from "@/types/wp"

const buildTag = (id: number, slug = "fp"): WordPressTag => ({
  id,
  databaseId: id,
  name: `Front Page ${id}`,
  slug,
})

describe("getFpTagForCountry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"))
    invalidateFpTagCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    invalidateFpTagCache()
  })

  it("reuses cached FP tag results within the TTL", async () => {
    const graphqlSpy = vi
      .spyOn(graphqlClient, "fetchFromWpGraphQL")
      .mockResolvedValueOnce({
        tag: { databaseId: 101, slug: "fp", name: "Front Page 101" },
      })
    const restSpy = vi.spyOn(restClient, "fetchFromWp").mockResolvedValue([] as WordPressTag[])

    const first = await getFpTagForCountry("za", { tags: ["frontpage"] })
    const second = await getFpTagForCountry("za", { tags: ["frontpage"] })

    expect(graphqlSpy).toHaveBeenCalledTimes(1)
    expect(graphqlSpy).toHaveBeenCalledWith(
      "za",
      expect.any(String),
      expect.objectContaining({ slug: "fp" }),
      expect.arrayContaining([expect.stringContaining("country:za")]),
    )
    expect(restSpy).not.toHaveBeenCalled()
    expect(first?.id).toBe(101)
    expect(second?.id).toBe(101)
  })

  it("refetches the FP tag after the cache expires", async () => {
    const graphqlSpy = vi
      .spyOn(graphqlClient, "fetchFromWpGraphQL")
      .mockResolvedValueOnce({
        tag: { databaseId: 101, slug: "fp", name: "Front Page 101" },
      })
      .mockResolvedValueOnce({
        tag: { databaseId: 202, slug: "fp", name: "Front Page 202" },
      })

    vi.spyOn(restClient, "fetchFromWp").mockResolvedValue([] as WordPressTag[])

    await getFpTagForCountry("za")

    const ttlMs = CACHE_DURATIONS.MEDIUM * 1000
    vi.advanceTimersByTime(ttlMs + 1)

    const refreshed = await getFpTagForCountry("za")

    expect(graphqlSpy).toHaveBeenCalledTimes(2)
    expect(refreshed?.id).toBe(202)
  })

  it("falls back to REST when GraphQL returns no data", async () => {
    vi.spyOn(graphqlClient, "fetchFromWpGraphQL").mockResolvedValueOnce({ tag: null })
    const restSpy = vi
      .spyOn(restClient, "fetchFromWp")
      .mockResolvedValueOnce([buildTag(303)])

    const tag = await getFpTagForCountry("za")

    expect(restSpy).toHaveBeenCalledTimes(1)
    expect(tag?.id).toBe(303)
  })
})
