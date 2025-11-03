import { afterEach, describe, expect, it, vi } from "vitest"

describe("fetchWordPressGraphQL in-flight deduplication", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../utils/fetchWithRetry")
  })

  const setup = async () => {
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

    return { fetchWordPressGraphQL, fetchWithRetryMock, mockJson }
  }

  it("returns the same promise for identical in-flight requests", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockJson } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query")
    const secondPromise = fetchWordPressGraphQL("sz", "query")

    expect(firstPromise).toBe(secondPromise)

    const result = await firstPromise

    expect(result).toEqual({ posts: [] })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(mockJson).toHaveBeenCalledTimes(1)
  })

  it("dedupes requests regardless of tag ordering", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      tags: ["b", "a", "a"],
    })
    const secondPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      tags: ["a", "b"],
    })

    expect(firstPromise).toBe(secondPromise)

    await firstPromise

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        next: expect.objectContaining({
          tags: ["a", "b"],
        }),
      }),
    )
  })

  it("starts a new in-flight request when the revalidate duration differs", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 10,
    })
    const secondPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 20,
    })

    expect(firstPromise).not.toBe(secondPromise)

    await Promise.all([firstPromise, secondPromise])

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
  })

  it("starts a new in-flight request when cache tags differ", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      tags: ["a"],
    })
    const secondPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      tags: ["b"],
    })

    expect(firstPromise).not.toBe(secondPromise)

    await Promise.all([firstPromise, secondPromise])

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
  })

  it("starts a new in-flight request when both revalidate and tags differ", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 10,
      tags: ["a"],
    })
    const secondPromise = fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 20,
      tags: ["b"],
    })

    expect(firstPromise).not.toBe(secondPromise)

    await Promise.all([firstPromise, secondPromise])

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
  })
})
