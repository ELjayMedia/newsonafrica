import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { CACHE_DURATIONS } from "../cache/constants"
import * as client from "./client"
import { getFpTagForCountry, invalidateFpTagCache } from "./shared"
import type { WordPressTag } from "@/types/wp"

const buildTag = (id: number, slug = "fp"): WordPressTag => ({
  id,
  name: `Front Page ${id}`,
  slug,
  taxonomy: "post_tag",
  link: `https://example.com/tag/${slug}`,
  meta: [],
  parent: 0,
  count: 1,
  _links: {},
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
    const fetchSpy = vi
      .spyOn(client, "fetchFromWp")
      .mockResolvedValueOnce([buildTag(101)])

    const first = await getFpTagForCountry("za", { tags: ["frontpage"] })
    const second = await getFpTagForCountry("za", { tags: ["frontpage"] })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      "za",
      expect.objectContaining({ endpoint: expect.stringContaining("tags") }),
      expect.objectContaining({ tags: ["frontpage"] }),
    )
    expect(first?.id).toBe(101)
    expect(second?.id).toBe(101)
  })

  it("refetches the FP tag after the cache expires", async () => {
    const fetchSpy = vi
      .spyOn(client, "fetchFromWp")
      .mockResolvedValueOnce([buildTag(101)])
      .mockResolvedValueOnce([buildTag(202)])

    await getFpTagForCountry("za")

    const ttlMs = CACHE_DURATIONS.MEDIUM * 1000
    vi.advanceTimersByTime(ttlMs + 1)

    const refreshed = await getFpTagForCountry("za")

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(refreshed?.id).toBe(202)
  })
})
