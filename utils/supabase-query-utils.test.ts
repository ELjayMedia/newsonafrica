import { beforeEach, describe, expect, it, vi } from "vitest"

import { clearQueryCache, countRecords, fetchPaginated } from "./supabase-query-utils"

const hoisted = vi.hoisted(() => {
  const mockClient: Record<string, any> = {
    from: vi.fn(),
  }
  const createClientMock = vi.fn(() => mockClient)

  return { mockClient, createClientMock }
})

vi.mock("./supabase-client", () => ({
  createClient: hoisted.createClientMock,
}))

const { mockClient, createClientMock } = hoisted

beforeEach(() => {
  clearQueryCache()
  mockClient.from = vi.fn()
  createClientMock.mockClear()
  createClientMock.mockReturnValue(mockClient)
})

describe("countRecords caching", () => {
  it("reuses cached results when cacheKeySuffix is provided", async () => {
    const selectMock = vi.fn().mockResolvedValue({ count: 5 })
    mockClient.from.mockReturnValue({ select: selectMock })

    const filtersFactory = () => (query: any) => query
    const suffix = "status=published"

    const firstResult = await countRecords("articles", filtersFactory(), { cacheKeySuffix: suffix })
    const secondResult = await countRecords("articles", filtersFactory(), { cacheKeySuffix: suffix })

    expect(firstResult).toBe(5)
    expect(secondResult).toBe(5)
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(mockClient.from).toHaveBeenCalledTimes(1)
  })

  it("includes cacheKeySuffix in the cache key even when filters are absent", async () => {
    const selectMock = vi.fn().mockResolvedValue({ count: 3 })
    mockClient.from.mockReturnValue({ select: selectMock })

    const suffix = "without-filters"

    await countRecords("articles", undefined, { cacheKeySuffix: suffix })
    clearQueryCache(undefined, new RegExp(suffix))
    await countRecords("articles", undefined, { cacheKeySuffix: suffix })

    expect(selectMock).toHaveBeenCalledTimes(2)
    expect(mockClient.from).toHaveBeenCalledTimes(2)
  })

  it("skips caching when filters are provided without a cacheKeySuffix", async () => {
    const selectMock = vi.fn().mockResolvedValue({ count: 2 })
    mockClient.from.mockReturnValue({ select: selectMock })

    await countRecords("articles", (query: any) => query)
    await countRecords("articles", (query: any) => query)

    expect(selectMock).toHaveBeenCalledTimes(2)
    expect(mockClient.from).toHaveBeenCalledTimes(2)
  })
})

describe("fetchPaginated caching", () => {
  const createPaginatedMocks = (data = [{ id: 1 }], count = 1) => {
    const rangeMock = vi.fn().mockResolvedValue({ data, count })
    const orderMock = vi.fn(() => ({ range: rangeMock }))
    const selectMock = vi.fn(() => ({ order: orderMock }))

    mockClient.from.mockReturnValue({ select: selectMock })

    return { rangeMock, selectMock }
  }

  it("reuses cached paginated results when cacheKeySuffix is provided", async () => {
    const { rangeMock } = createPaginatedMocks()

    const filtersFactory = () => (query: any) => query
    const suffix = "status=published"

    const firstResult = await fetchPaginated("articles", {
      filters: filtersFactory(),
      cacheKeySuffix: suffix,
    })
    const secondResult = await fetchPaginated("articles", {
      filters: filtersFactory(),
      cacheKeySuffix: suffix,
    })

    expect(firstResult).toEqual({
      data: [{ id: 1 }],
      count: 1,
      pageCount: 1,
      hasMore: false,
    })
    expect(secondResult).toBe(firstResult)
    expect(rangeMock).toHaveBeenCalledTimes(1)
    expect(mockClient.from).toHaveBeenCalledTimes(1)
  })

  it("includes cacheKeySuffix in the cache key even without filters", async () => {
    const { rangeMock } = createPaginatedMocks()
    const suffix = "page=1"

    await fetchPaginated("articles", { cacheKeySuffix: suffix })
    clearQueryCache(undefined, new RegExp(suffix))
    await fetchPaginated("articles", { cacheKeySuffix: suffix })

    expect(rangeMock).toHaveBeenCalledTimes(2)
    expect(mockClient.from).toHaveBeenCalledTimes(2)
  })

  it("skips caching when filters are provided without a cacheKeySuffix", async () => {
    const { rangeMock } = createPaginatedMocks([], 0)

    await fetchPaginated("articles", { filters: (query: any) => query })
    await fetchPaginated("articles", { filters: (query: any) => query })

    expect(rangeMock).toHaveBeenCalledTimes(2)
    expect(mockClient.from).toHaveBeenCalledTimes(2)
  })
})
