import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/graphql/schemas", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql/schemas")>("@/lib/graphql/schemas")
  return { ...actual, getOperationValidationSchemas: vi.fn(() => undefined) }
})

const setup = async () => {
  const fetchWithRetryMock = vi.fn()
  vi.doMock("../utils/fetchWithRetry", () => ({ fetchWithRetry: fetchWithRetryMock }))

  const mockText = vi.fn().mockResolvedValue(JSON.stringify({ data: { posts: [] } }))
  fetchWithRetryMock.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: mockText,
  } as unknown as Response)

  const memoSymbol = Symbol.for("newsonafrica.wpGraphqlMemo")
  const existingMemoStore = (globalThis as Record<string | symbol, unknown>)[memoSymbol]
  if (existingMemoStore instanceof Map) existingMemoStore.clear()

  const { fetchWordPressGraphQL, __getMemoizedRequestsForTests } = await import("./client")

  return {
    fetchWordPressGraphQL,
    fetchWithRetryMock,
    mockText,
    getMemoStoreForTests: () => __getMemoizedRequestsForTests(),
  }
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("../utils/fetchWithRetry")
  vi.restoreAllMocks()
})

describe("fetchWordPressGraphQL baseline behavior", () => {
  it("dedupes identical in-flight requests", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, mockText } = await setup()

    const first = fetchWordPressGraphQL("sz", "query")
    const second = fetchWordPressGraphQL("sz", "query")

    expect(second).toBe(first)
    await expect(first).resolves.toMatchObject({ ok: true, data: { posts: [] } })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it("removes non-OK responses from memoization so retries refetch", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock, getMemoStoreForTests } = await setup()

    fetchWithRetryMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as unknown as Response)

    await expect(fetchWordPressGraphQL("sz", "query")).resolves.toMatchObject({
      ok: false,
      kind: "http_error",
      status: 503,
    })
    expect(getMemoStoreForTests().size).toBe(0)

    await expect(fetchWordPressGraphQL("sz", "query")).resolves.toMatchObject({
      ok: true,
      data: { posts: [] },
    })
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2)
  })

  it("dedupes cache tags regardless of tag ordering", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "query", undefined, { tags: ["b", "a", "a"] })
    await fetchWordPressGraphQL("sz", "query", undefined, { tags: ["a", "b"] })

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: expect.objectContaining({ tags: ["a", "b"] }) }),
    )
  })

  it("uses POST transport by default", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL("sz", "query TransportPosts { posts { id } }", { limit: 3 })

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "query TransportPosts { posts { id } }",
          variables: { limit: 3 },
        }),
      }),
    )
  })

  it("uses GET transport for eligible read queries", async () => {
    const { fetchWordPressGraphQL, fetchWithRetryMock } = await setup()

    await fetchWordPressGraphQL(
      "sz",
      "query TransportPost($slug: String!) { post(id: $slug) { id } }",
      { slug: "hello world" },
      { transport: "get" },
    )

    expect(fetchWithRetryMock).toHaveBeenCalledWith(
      expect.stringContaining("query=query+TransportPost"),
      expect.objectContaining({ method: "GET" }),
    )

    const [, fetchOptions] = fetchWithRetryMock.mock.calls[0]
    expect(fetchOptions.body).toBeUndefined()
  })
})
