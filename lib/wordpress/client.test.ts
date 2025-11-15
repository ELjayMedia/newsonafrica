import { afterEach, describe, expect, it, vi } from "vitest"

describe("fetchWordPressGraphQL in-flight deduplication", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../utils/fetchWithRetry")
    vi.restoreAllMocks()
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

    const memoSymbol = Symbol.for("newsonafrica.wpGraphqlMemo")
    const globalWithMemo = globalThis as Record<string | symbol, unknown>
    const existingMemoStore = globalWithMemo[memoSymbol]

    if (existingMemoStore instanceof Map) {
      existingMemoStore.clear()
    }

    const { fetchWordPressGraphQL, __getMemoizedRequestsForTests } = await import(
      "./client",
    )

    return {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockJson,
      getMemoStoreForTests: () => __getMemoizedRequestsForTests(),
    }
  }

  it("returns the same promise for identical in-flight requests", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockJson } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query")
    const secondPromise = fetchWordPressGraphQL("sz", "query")

    expect(firstPromise).toBe(secondPromise)

    const result = await firstPromise

    expect(result).toMatchObject({
      ok: true,
      data: { posts: [] },
      posts: [],
    })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(mockJson).toHaveBeenCalledTimes(1)
  })

  it("memoizes resolved responses for sequential calls", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockJson } = await setup()

    const firstPromise = fetchWordPressGraphQL("sz", "query")
    await firstPromise
    const secondPromise = fetchWordPressGraphQL("sz", "query")

    expect(secondPromise).toBe(firstPromise)

    const secondResult = await secondPromise

    expect(secondResult).toMatchObject({
      ok: true,
      data: { posts: [] },
      posts: [],
    })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(mockJson).toHaveBeenCalledTimes(1)
  })

  it("clears failed memoized promises so subsequent calls retry", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockJson,
      getMemoStoreForTests,
    } = await setup()

    const networkError = new Error("boom")
    fetchWithRetryMock.mockRejectedValueOnce(networkError)

    const firstPromise = fetchWordPressGraphQL("sz", "query")

    await expect(firstPromise).rejects.toThrow(networkError)
    expect(getMemoStoreForTests().size).toBe(0)

    const secondPromise = fetchWordPressGraphQL("sz", "query")

    await expect(secondPromise).resolves.toMatchObject({
      ok: true,
      data: { posts: [] },
      posts: [],
    })

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
    expect(mockJson).toHaveBeenCalledTimes(1)
  })

  it("does not cache HTTP failures so subsequent calls refetch", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockJson,
      getMemoStoreForTests,
    } = await setup()

    const failureJson = vi.fn()
    const failureResponse = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: failureJson,
    }

    fetchWithRetryMock.mockResolvedValueOnce(
      failureResponse as unknown as Response,
    )

    const firstPromise = fetchWordPressGraphQL("sz", "query")

    const firstResult = await firstPromise

    expect(firstResult).toMatchObject({
      ok: false,
      kind: "http_error",
      status: 503,
      statusText: "Service Unavailable",
    })
    expect(failureJson).not.toHaveBeenCalled()
    expect(getMemoStoreForTests().size).toBe(0)

    const secondPromise = fetchWordPressGraphQL("sz", "query")

    expect(secondPromise).not.toBe(firstPromise)

    await expect(secondPromise).resolves.toMatchObject({
      ok: true,
      data: { posts: [] },
      posts: [],
    })

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
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

  it("triggers a new fetch when cache hints change between calls", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 15,
      tags: ["a", "b"],
    })

    await fetchWordPressGraphQL("sz", "query", undefined, {
      revalidate: 30,
      tags: ["c"],
    })

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
    expect(fetchWithRetryMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        next: expect.objectContaining({
          revalidate: 15,
          tags: ["a", "b"],
        }),
      }),
    )
    expect(fetchWithRetryMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        next: expect.objectContaining({
          revalidate: 30,
          tags: ["c"],
        }),
      }),
    )
  })

  it("passes the timeout override to fetchWithRetry", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("ng", "query", undefined, {
      timeout: 1234,
    })

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 1234 }),
    )
  })
})
