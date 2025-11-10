import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchWithRetry } from "./fetchWithRetry"
import { fetchWithTimeout } from "./fetchWithTimeout"

vi.mock("./fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}))

describe("fetchWithRetry", () => {
  const fetchWithTimeoutMock = vi.mocked(fetchWithTimeout)

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it("retries 429 responses using the Retry-After delay", async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")

    fetchWithTimeoutMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "3" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
        }),
      )

    const fetchPromise = fetchWithRetry("https://example.com", {
      attempts: 2,
      backoffMs: 100,
      backoffFactor: 2,
    })

    await vi.advanceTimersByTimeAsync(2999)
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await fetchPromise

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2)
    expect(setTimeoutSpy).toHaveBeenCalled()
    const firstDelay = setTimeoutSpy.mock.calls[0]?.[1]
    expect(firstDelay).toBe(3000)

    setTimeoutSpy.mockRestore()
  })

  it("applies jitter to backoff delays when enabled", async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")

    fetchWithTimeoutMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
        }),
      )

    const fetchPromise = fetchWithRetry("https://example.com", {
      attempts: 2,
      backoffMs: 1000,
      jitter: true,
      random: () => 0.25,
    })

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).toHaveBeenCalled()
    const [, delay] = setTimeoutSpy.mock.calls[0] ?? []
    expect(delay).toBe(250)

    await vi.advanceTimersByTimeAsync(250)
    await fetchPromise
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2)

    setTimeoutSpy.mockRestore()
  })

  it("allows dependency injection for keep-alive agents", async () => {
    const agent = { keepAlive: true }

    fetchWithTimeoutMock.mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    )

    await fetchWithRetry("https://example.com/graphql", {
      getAgent: () => agent,
    })

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      "https://example.com/graphql",
      expect.objectContaining({ agent }),
    )
  })
})
