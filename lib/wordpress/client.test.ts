import { afterEach, describe, expect, it, vi } from "vitest"

describe("fetchWordPressGraphQL in-flight deduplication", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../utils/fetchWithRetry")
  })

  it("returns the same promise for identical in-flight requests", async () => {
    const fetchWithRetryMock = vi.fn()

    vi.doMock("../utils/fetchWithRetry", () => ({
      fetchWithRetry: fetchWithRetryMock,
    }))

    const mockJson = vi.fn().mockResolvedValue({ data: { posts: [] } })
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: mockJson,
    }

    fetchWithRetryMock.mockResolvedValue(mockResponse as unknown as Response)

    const { fetchWordPressGraphQL } = await import("./client")

    const firstPromise = fetchWordPressGraphQL("sz", "query")
    const secondPromise = fetchWordPressGraphQL("sz", "query")

    expect(firstPromise).toBe(secondPromise)

    const result = await firstPromise

    expect(result).toEqual({ posts: [] })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(mockJson).toHaveBeenCalledTimes(1)
  })
})
