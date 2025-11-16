import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const applyCookiesMock = vi.fn((response: Response) => response)

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}))

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: vi.fn(),
  revalidateMultiplePaths: vi.fn(),
}))

const executeListQueryMock = vi.fn()
vi.mock("@/lib/supabase/list-query", () => ({
  executeListQuery: (...args: unknown[]) => executeListQueryMock(...args),
}))

const fetchBookmarkStatsMock = vi.fn()
const getDefaultBookmarkStatsMock = vi.fn()
vi.mock("@/lib/bookmarks/stats", () => ({
  fetchBookmarkStats: (...args: unknown[]) => fetchBookmarkStatsMock(...args),
  getDefaultBookmarkStats: (...args: unknown[]) => getDefaultBookmarkStatsMock(...args),
}))

const ensureCollectionAssignmentMock = vi.fn()
vi.mock("@/lib/bookmarks/collections", () => ({
  ensureBookmarkCollectionAssignment: (...args: unknown[]) =>
    ensureCollectionAssignmentMock(...args),
}))

const applyBookmarkCounterDeltaMock = vi.fn()
vi.mock("@/lib/bookmarks/counters", () => ({
  applyBookmarkCounterDelta: (...args: unknown[]) => applyBookmarkCounterDeltaMock(...args),
}))

const buildAdditionCounterDeltaMock = vi.fn()
const buildRemovalCounterDeltaMock = vi.fn()
const buildUpdateCounterDeltaMock = vi.fn()
const prepareBookmarkUpdatePayloadMock = vi.fn()
vi.mock("@/lib/bookmarks/mutations", () => ({
  buildAdditionCounterDelta: (...args: unknown[]) => buildAdditionCounterDeltaMock(...args),
  buildRemovalCounterDelta: (...args: unknown[]) => buildRemovalCounterDeltaMock(...args),
  buildUpdateCounterDelta: (...args: unknown[]) => buildUpdateCounterDeltaMock(...args),
  prepareBookmarkUpdatePayload: (...args: unknown[]) => prepareBookmarkUpdatePayloadMock(...args),
}))

import { createSupabaseRouteClient } from "@/lib/supabase/route"
import { revalidateByTag, revalidateMultiplePaths } from "@/lib/server-cache-utils"
import { cacheTags } from "@/lib/cache"
import { DELETE, GET, POST, PUT } from "./route"

function expectBookmarkTagInvalidation(
  userId: string,
  editions: Array<string | null | undefined>,
  collections: Array<string | null | undefined> = [],
) {
  const expectedTags = new Set([
    cacheTags.bmUser(userId),
    ...editions.map((edition) => cacheTags.bookmarks(edition)),
    ...collections.map((collection) => cacheTags.bmCollection(collection)),
  ])

  const calls = vi.mocked(revalidateByTag).mock.calls.map(([tag]) => tag)

  expect(new Set(calls)).toEqual(expectedTags)
  expect(calls).toHaveLength(expectedTags.size)
  expect(revalidateMultiplePaths).not.toHaveBeenCalled()
}

describe("/api/bookmarks cache revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseRouteClient).mockReset()
    executeListQueryMock.mockReset()
    fetchBookmarkStatsMock.mockReset()
    getDefaultBookmarkStatsMock.mockReset()
    applyCookiesMock.mockImplementation((response: Response) => response)
    ensureCollectionAssignmentMock.mockReset()
    ensureCollectionAssignmentMock.mockResolvedValue(null)
    applyBookmarkCounterDeltaMock.mockReset()
    applyBookmarkCounterDeltaMock.mockResolvedValue(undefined)
    buildAdditionCounterDeltaMock.mockReset()
    buildAdditionCounterDeltaMock.mockReturnValue({ total: 1 })
    buildRemovalCounterDeltaMock.mockReset()
    buildRemovalCounterDeltaMock.mockReturnValue(null)
    buildUpdateCounterDeltaMock.mockReset()
    buildUpdateCounterDeltaMock.mockReturnValue(null)
    prepareBookmarkUpdatePayloadMock.mockReset()
    prepareBookmarkUpdatePayloadMock.mockReturnValue({
      dbUpdates: { note: "updated" },
      targetEditionCode: null,
      targetCollectionId: null,
      shouldResolveCollection: false,
      hasWritableUpdate: true,
    })
  })

  it("revalidates the user and edition tags after creating a bookmark", async () => {
    const user = { id: "user-1" }

    const insertedRow = {
      id: "bookmark-1",
      userId: user.id,
      postId: "post-1",
      slug: "",
      country: "ng",
      collectionId: "collection-1",
      title: "Saved post",
      excerpt: "",
      featuredImage: null,
      category: "news",
      tags: null,
      readState: "unread" as const,
      note: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const existingCheck = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedRow }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi
        .fn()
        .mockImplementationOnce(() => existingCheck)
        .mockImplementationOnce(() => insertChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ payload: { postId: "post-1", country: "ng", category: "news" } }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.added[0]).toMatchObject({ id: "bookmark-1", country: "ng" })
    expect(json.data.statsDelta).toEqual({
      total: 1,
      unread: 1,
      categories: { news: 1 },
      readStates: { unread: 1 },
      collections: { "collection-1": 1 },
    })
    expectBookmarkTagInvalidation(user.id, ["ng"], ["collection-1"])
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to the default edition tag when no bookmark country is provided", async () => {
    const user = { id: "user-4" }

    const insertedRow = {
      id: "bookmark-4",
      userId: user.id,
      postId: "post-4",
      slug: "",
      country: null,
      collectionId: null,
      title: "Untitled",
      excerpt: "",
      featuredImage: null,
      category: null,
      tags: null,
      readState: "unread" as const,
      note: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const existingCheck = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedRow }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi
        .fn()
        .mockImplementationOnce(() => existingCheck)
        .mockImplementationOnce(() => insertChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ payload: { postId: "post-4" } }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.added[0]).toMatchObject({ id: "bookmark-4" })
    expect(json.data.statsDelta).toEqual({
      total: 1,
      unread: 1,
      categories: {},
      readStates: { unread: 1 },
      collections: { __unassigned__: 1 },
    })
    expectBookmarkTagInvalidation(user.id, [null], [null])
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("revalidates the user and edition tags after updating a bookmark", async () => {
    const user = { id: "user-2" }

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "bookmark-2", country: "ke", collectionId: "collection-2", readState: "unread" },
        error: null,
      }),
    }

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "bookmark-2",
          country: "ke",
          collectionId: "collection-3",
          readState: "unread" as const,
          note: "updated",
        },
        error: null,
      }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn()
        .mockImplementationOnce(() => existingChain)
        .mockImplementationOnce(() => updateChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "PUT",
      body: JSON.stringify({ payload: { postId: "post-2", updates: { note: "updated" } } }),
      headers: { "content-type": "application/json" },
    })

    const response = await PUT(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.updated[0]).toMatchObject({ id: "bookmark-2", note: "updated" })
    expect(json.data.statsDelta).toEqual({
      total: 0,
      unread: 0,
      categories: {},
      readStates: {},
      collections: { "collection-2": -1, "collection-3": 1 },
    })
    expectBookmarkTagInvalidation(user.id, ["ke"], ["collection-2", "collection-3"])
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("returns 400 when no updates object is provided", async () => {
    const user = { id: "user-6" }
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "PUT",
      body: JSON.stringify({ postId: "post-6" }),
      headers: { "content-type": "application/json" },
    })

    const response = await PUT(request)

    expect(response.status).toBe(400)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
    expect(ensureCollectionAssignmentMock).not.toHaveBeenCalled()
    expect(prepareBookmarkUpdatePayloadMock).not.toHaveBeenCalled()
  })

  it("returns 400 when no bookmark updates are recognized", async () => {
    const user = { id: "user-7" }

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "bookmark-7", country: null, collectionId: null },
        error: null,
      }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(existingChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    prepareBookmarkUpdatePayloadMock.mockReturnValueOnce({
      dbUpdates: {},
      targetEditionCode: null,
      targetCollectionId: null,
      shouldResolveCollection: false,
      hasWritableUpdate: false,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "PUT",
      body: JSON.stringify({ postId: "post-7", updates: {} }),
      headers: { "content-type": "application/json" },
    })

    const response = await PUT(request)

    expect(response.status).toBe(400)
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
    expect(ensureCollectionAssignmentMock).not.toHaveBeenCalled()
  })

  it("revalidates the user and edition tags after deleting bookmarks", async () => {
    const user = { id: "user-3" }

    const deleteChain: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: "bookmark-3",
            userId: "user-3",
            postId: "post-3",
            slug: "post-3",
            country: "za",
            collectionId: "collection-9",
            category: "tech",
            readState: "unread" as const,
          },
        ],
        error: null,
      }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(deleteChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks?postId=post-3", {
      method: "DELETE",
    })

    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.removed[0]).toMatchObject({ postId: "post-3" })
    expect(json.data.statsDelta).toEqual({
      total: -1,
      unread: -1,
      categories: { tech: -1 },
      readStates: { unread: -1 },
      collections: { "collection-9": -1 },
    })
    expectBookmarkTagInvalidation(user.id, ["za"], ["collection-9"])
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("returns 503 when Supabase is unavailable", async () => {
    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce(null as any)

    const request = new NextRequest("https://example.com/api/bookmarks")

    const response = await GET(request)

    expect(response.status).toBe(503)
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
    expect(applyCookiesMock).not.toHaveBeenCalled()
    expect(revalidateByTag).not.toHaveBeenCalled()
    expect(revalidateMultiplePaths).not.toHaveBeenCalled()
  })
})

describe("/api/bookmarks cursor pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseRouteClient).mockReset()
    executeListQueryMock.mockReset()
    fetchBookmarkStatsMock.mockReset()
    getDefaultBookmarkStatsMock.mockReset()
    applyCookiesMock.mockImplementation((response: Response) => response)
  })

  function createQueryBuilder() {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    }
  }

  it("returns the next cursor after fetching a page", async () => {
    const user = { id: "user-1" }
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const builder = createQueryBuilder()
    const rows = [
      {
        id: "bookmark-1",
        userId: user.id,
        postId: "post-1",
        slug: "first",
        country: null,
        title: "First",
        excerpt: "",
        featuredImage: null,
        category: null,
        tags: null,
        readState: "unread" as const,
        note: null,
        createdAt: "2024-01-03T00:00:00.000Z",
      },
      {
        id: "bookmark-2",
        userId: user.id,
        postId: "post-2",
        slug: "second",
        country: null,
        title: "Second",
        excerpt: "",
        featuredImage: null,
        category: null,
        tags: null,
        readState: "unread" as const,
        note: null,
        createdAt: "2024-01-02T00:00:00.000Z",
      },
      {
        id: "bookmark-3",
        userId: user.id,
        postId: "post-3",
        slug: "third",
        country: null,
        title: "Third",
        excerpt: "",
        featuredImage: null,
        category: null,
        tags: null,
        readState: "unread" as const,
        note: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ]

    executeListQueryMock.mockImplementationOnce((_, table, callback) => {
      expect(table).toBe("bookmarks")
      const result = callback(builder as any)
      expect(result).toBe(builder)
      return { data: rows, error: null }
    })

    fetchBookmarkStatsMock.mockResolvedValue({
      total: 3,
      unread: 3,
      categories: {},
      readStates: {},
      collections: {},
    })

    const request = new NextRequest("https://example.com/api/bookmarks?limit=2")
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(builder.order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false })
    expect(builder.order).toHaveBeenNthCalledWith(2, "id", { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(3)
    expect(builder.range).not.toHaveBeenCalled()
    expect(fetchBookmarkStatsMock).toHaveBeenCalledTimes(1)
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)

    const body = await response.json()
    expect(body.bookmarks).toHaveLength(2)
    expect(body.pagination).toEqual(
      expect.objectContaining({ hasMore: true, limit: 2, nextCursor: expect.any(String) }),
    )

    const decodedCursor = JSON.parse(decodeURIComponent(body.pagination.nextCursor))
    expect(decodedCursor).toMatchObject({
      sortBy: "created_at",
      sortOrder: "desc",
      value: rows[1].createdAt,
      id: rows[1].id,
    })
  })

  it("applies cursor predicates for subsequent pages", async () => {
    const user = { id: "user-2" }
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const builder = createQueryBuilder()
    executeListQueryMock.mockImplementationOnce((_, __, callback) => {
      callback(builder as any)
      return { data: [], error: null }
    })

    const previousCursor = {
      sortBy: "created_at",
      sortOrder: "desc",
      value: "2024-01-02T00:00:00.000Z",
      id: "bookmark-2",
    }

    const request = new NextRequest(
      `https://example.com/api/bookmarks?limit=2&cursor=${encodeURIComponent(
        JSON.stringify(previousCursor),
      )}`,
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(builder.or).toHaveBeenCalledTimes(1)
    expect(builder.or).toHaveBeenCalledWith(
      `created_at.lt.${previousCursor.value},and(created_at.eq.${previousCursor.value},id.lt.${previousCursor.id})`,
    )
    expect(builder.limit).toHaveBeenCalledWith(3)
    expect(fetchBookmarkStatsMock).not.toHaveBeenCalled()
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)

    const body = await response.json()
    expect(body.stats).toBeNull()
  })
})
