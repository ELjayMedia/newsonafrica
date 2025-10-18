import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import {
  createCacheAwareFunction,
  fetchWithTimeout,
  withRetry,
  createThrottledQueue,
  defaults,
} from "@/lib/wp-server"

const cacheStores = new Map<string, Map<string, unknown>>()
let lastCacheOptions: { keyParts: readonly string[]; options: { revalidate?: number; tags?: string[] | undefined } } | null =
  null

vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: (...args: any[]) => Promise<unknown>,
    keyParts: readonly string[],
    options: { revalidate?: number; tags?: string[] },
  ) => {
    lastCacheOptions = { keyParts, options }
    const cacheKey = JSON.stringify(keyParts)
    const store = cacheStores.get(cacheKey) ?? new Map<string, unknown>()
    cacheStores.set(cacheKey, store)

    return async (...args: any[]) => {
      const key = JSON.stringify(args)
      if (store.has(key)) {
        return store.get(key)
      }

      const result = await fn(...args)
      store.set(key, result)
      return result
    }
  },
}))

describe("createCacheAwareFunction", () => {
  beforeEach(() => {
    cacheStores.clear()
    lastCacheOptions = null
  })

  it("memoises calls using the provided cache keys", async () => {
    const source = vi.fn(async (value: number) => value * 2)
    const cached = createCacheAwareFunction(source, {
      keyParts: ["wp", "test"],
      tags: ["posts", "posts", "latest"],
      revalidate: 60,
    })

    const first = await cached(21)
    const second = await cached(21)
    const third = await cached(7)

    expect(first).toBe(42)
    expect(second).toBe(42)
    expect(third).toBe(14)
    expect(source).toHaveBeenCalledTimes(2)
    expect(lastCacheOptions).not.toBeNull()
    expect(lastCacheOptions?.options.tags).toEqual(["posts", "latest"])
    expect(lastCacheOptions?.options.revalidate).toBe(60)
  })

  it("throws when keyParts are missing", () => {
    const source = vi.fn(async () => "data")
    expect(() => createCacheAwareFunction(source, { keyParts: [] })).toThrowError(
      /at least one cache key part/
    )
  })
})

describe("fetchWithTimeout", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it("aborts the request when the timeout elapses", async () => {
    vi.useFakeTimers()

    const abortError = new DOMException("Aborted", "AbortError")
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(abortError))
      }),
    )

    global.fetch = fetchMock as typeof global.fetch

    const request = fetchWithTimeout("https://example.com", { timeout: 25 })
    request.catch(() => {})
    const expectation = expect(request).rejects.toThrow(/aborted/i)

    await vi.advanceTimersByTimeAsync(30)

    await expectation
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("withRetry", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("retries operations with exponential backoff", async () => {
    vi.useFakeTimers()

    const errorOne = new Error("first")
    const errorTwo = new Error("second")

    const operation = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(errorOne)
      .mockRejectedValueOnce(errorTwo)
      .mockResolvedValue("success")

    const onRetry = vi.fn()
    const setTimeoutSpy = vi.spyOn(global, "setTimeout")

    const resultPromise = withRetry(operation, { onRetry })

    await vi.advanceTimersByTimeAsync(defaults.retryBaseDelay)
    await vi.advanceTimersByTimeAsync(defaults.retryBaseDelay * 2)

    const result = await resultPromise

    expect(result).toBe("success")
    expect(operation).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, errorOne)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, errorTwo)

    const retryDelays = setTimeoutSpy.mock.calls
      .map(([, delay]) => delay)
      .filter((value): value is number => typeof value === "number")

    expect(retryDelays.slice(0, 2)).toEqual([
      defaults.retryBaseDelay,
      Math.min(defaults.retryBaseDelay * 2, defaults.retryMaxDelay),
    ])

    setTimeoutSpy.mockRestore()
  })

  it("respects the shouldRetry predicate", async () => {
    vi.useFakeTimers()

    const operation = vi.fn().mockRejectedValue(new Error("fatal"))

    await expect(
      withRetry(operation, {
        retries: 5,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow(/fatal/)

    expect(operation).toHaveBeenCalledTimes(1)
  })
})

describe("createThrottledQueue", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("limits concurrent executions", async () => {
    vi.useFakeTimers()

    const queue = createThrottledQueue({ concurrency: 2 })
    let active = 0
    let maxActive = 0

    const tasks = Array.from({ length: 5 }).map((_, index) =>
      queue(async () => {
        active += 1
        maxActive = Math.max(maxActive, active)
        return await new Promise<number>((resolve) => {
          setTimeout(() => {
            active -= 1
            resolve(index)
          }, 100)
        })
      }),
    )

    const all = Promise.all(tasks)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(all).resolves.toEqual([0, 1, 2, 3, 4])
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it("applies the configured throttle interval", async () => {
    vi.useFakeTimers()

    const queue = createThrottledQueue({ concurrency: 1, intervalMs: 50 })
    const startTimes: number[] = []

    const tasks = Array.from({ length: 3 }).map(() =>
      queue(async () => {
        startTimes.push(Date.now())
      }),
    )

    const all = Promise.all(tasks)
    await vi.advanceTimersByTimeAsync(500)
    await all

    const intervals = startTimes
      .slice(1)
      .map((time, index) => time - startTimes[index])

    intervals.forEach((interval) => {
      expect(interval).toBeGreaterThanOrEqual(50)
    })
  })
})
