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
})
