import { beforeEach, describe, expect, it, vi } from "vitest"

import { clearQueryCache, executeWithCache } from "./supabase-query-utils"

describe("executeWithCache", () => {
  beforeEach(() => {
    clearQueryCache()
  })

  it("returns cached data on subsequent calls", async () => {
    const fetcher = vi.fn(async () => ({ value: Math.random() }))

    const firstResult = await executeWithCache(fetcher, "test-key", 10_000)
    const secondResult = await executeWithCache(fetcher, "test-key", 10_000)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(secondResult).toEqual(firstResult)
  })

  it("bypasses cache when force option is provided", async () => {
    const fetcher = vi.fn(async () => ({ value: Math.random() }))

    const first = await executeWithCache(fetcher, "force-key", 10_000)
    const result = await executeWithCache(fetcher, "force-key", 10_000, { force: true })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result).not.toBe(first)
  })
})

describe("clearQueryCache", () => {
  it("removes matching cache keys", async () => {
    clearQueryCache()

    const fetcher = vi.fn(async () => ({ value: Math.random() }))

    await executeWithCache(fetcher, "match-key-1", 10_000)
    await executeWithCache(fetcher, "match-key-2", 10_000)

    clearQueryCache(undefined, /^match-key-\d$/)

    await executeWithCache(fetcher, "match-key-1", 10_000)
    await executeWithCache(fetcher, "match-key-2", 10_000)

    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
