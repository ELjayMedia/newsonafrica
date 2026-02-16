import { afterEach, describe, expect, it, vi } from "vitest"

import { CACHE_DURATIONS } from "../cache/constants"

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

    const mockText = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ data: { posts: [] } }))
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: mockText,
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
      mockText,
      getMemoStoreForTests: () => __getMemoizedRequestsForTests(),
    }
  }

  it("returns the same promise for identical in-flight requests", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockText } = await setup()

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
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it("memoizes resolved responses for sequential calls", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockText } = await setup()

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
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it("clears failed memoized promises so subsequent calls retry", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockText,
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
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it("removes cached entries for non-OK responses so retries re-fetch", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockText,
      getMemoStoreForTests,
    } = await setup()

    fetchWithRetryMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as unknown as Response)

    const firstResult = await fetchWordPressGraphQL("sz", "query")

    expect(firstResult).toMatchObject({
      ok: false,
      kind: "http_error",
      status: 503,
      statusText: "Service Unavailable",
    })
    expect(getMemoStoreForTests().size).toBe(0)

    const secondResult = await fetchWordPressGraphQL("sz", "query")

    expect(secondResult).toMatchObject({
      ok: true,
      data: { posts: [] },
      posts: [],
    })

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it("returns an invalid_payload failure when the response body is not JSON", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      getMemoStoreForTests,
    } = await setup()

    const badResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: vi.fn().mockResolvedValue("<!doctype html><html></html>"),
    }

    fetchWithRetryMock.mockResolvedValueOnce(badResponse as unknown as Response)

    const result = await fetchWordPressGraphQL("sz", "query")

    expect(result).toMatchObject({
      ok: false,
      kind: "invalid_payload",
      bodySnippet: "<!doctype html><html></html>",
      status: 200,
    })
    expect(badResponse.text).toHaveBeenCalledTimes(1)
    expect(getMemoStoreForTests().size).toBe(0)
  })

  it("does not memoize invalid payload responses so subsequent calls retry", async () => {
    const {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
      mockText,
      getMemoStoreForTests,
    } = await setup()

    const badResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: vi.fn().mockResolvedValue("not-json"),
    }

    fetchWithRetryMock.mockResolvedValueOnce(badResponse as unknown as Response)

    const firstResult = await fetchWordPressGraphQL("sz", "query")

    expect(firstResult).toMatchObject({ ok: false, kind: "invalid_payload" })
    expect(getMemoStoreForTests().size).toBe(0)

    const secondResult = await fetchWordPressGraphQL("sz", "query")

    expect(secondResult).toMatchObject({ ok: true, data: { posts: [] } })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
    expect(mockText).toHaveBeenCalledTimes(1)
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

  it("memoizes tagged requests with a finite TTL when revalidate is NONE", async () => {
    const { fetchWordPressGraphQL, getMemoStoreForTests } = await setup()

    await fetchWordPressGraphQL("sz", "query", undefined, {
      tags: ["news"],
      revalidate: CACHE_DURATIONS.NONE,
    })

    const memoStore = getMemoStoreForTests()
    expect(memoStore.size).toBe(1)
    const [entry] = Array.from(memoStore.values())
    expect(entry?.metadataKey).toBe(`ttl:${CACHE_DURATIONS.SHORT}`)
    expect(Number.isFinite(entry?.expiresAt)).toBe(true)
    expect((entry?.expiresAt ?? 0) - Date.now()).toBeGreaterThan(0)
  })
})


describe("fetchWordPressGraphQL transport modes", () => {
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

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: vi.fn().mockResolvedValue(JSON.stringify({ data: { posts: [] } })),
    }

    fetchWithRetryMock.mockResolvedValue(mockResponse as unknown as Response)

    const { fetchWordPressGraphQL } = await import("./client")

    return {
      fetchWordPressGraphQL,
      fetchWithRetryMock,
    }
  }

  it("uses POST transport by default", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "query Posts { posts { id } }", { limit: 3 })

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "query Posts { posts { id } }",
          variables: { limit: 3 },
        }),
      }),
    )
  })

  it("uses GET transport for eligible read queries", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "query Posts($slug: String!) { post(id: $slug) { id } }", { slug: "hello world" }, { transport: "get" })

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.stringContaining("query=query+Posts%28%24slug%3A+String%21%29+%7B+post%28id%3A+%24slug%29+%7B+id+%7D+%7D"),
      expect.objectContaining({
        method: "GET",
      }),
    )

    const [, fetchOptions] = fetchWithRetryMock.mock.calls[0]
    expect(fetchOptions.body).toBeUndefined()
  })

  it("uses persisted query identifier when configured", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL(
      "sz",
      "query Posts { posts { id } }",
      { locale: "en" },
      { transport: "get", persistedQueryId: "abc123" },
    )

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.stringContaining("persistedQueryId=abc123"),
      expect.objectContaining({
        method: "GET",
      }),
    )

    const [requestUrl] = fetchWithRetryMock.mock.calls[0]
    expect(String(requestUrl)).not.toContain("query=")
    expect(String(requestUrl)).toContain("variables=%7B%22locale%22%3A%22en%22%7D")
  })

  it("falls back to POST when GET is requested for unsupported query forms", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "mutation UpdatePost { updatePost(id: 1) { id } }", undefined, {
      transport: "get",
    })

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "mutation UpdatePost { updatePost(id: 1) { id } }",
          variables: undefined,
        }),
      }),
    )
  })

  it("falls back to POST when GET URL would be too long", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL(
      "sz",
      "query Posts($slug: String!) { post(id: $slug) { id } }",
      { slug: "x".repeat(5000) },
      { transport: "get" },
    )

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
      }),
    )

    const [requestUrl, fetchOptions] = fetchWithRetryMock.mock.calls[0]
    expect(String(requestUrl)).not.toContain("query=")
    expect(fetchOptions.body).toContain('"slug":"')
  })
})
