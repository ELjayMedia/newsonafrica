import { beforeEach, describe, expect, it, vi } from "vitest"

const executeListQueryMock = vi.fn()
vi.mock("@/lib/supabase/list-query", () => ({
  executeListQuery: (...args: unknown[]) => executeListQueryMock(...args),
}))

const fetchBookmarkStatsMock = vi.fn()
const getDefaultBookmarkStatsMock = vi.fn(() => ({
  total: 0,
  unread: 0,
  categories: {},
  readStates: {},
  collections: {},
}))
vi.mock("@/lib/bookmarks/stats", () => ({
  fetchBookmarkStats: (...args: unknown[]) => fetchBookmarkStatsMock(...args),
  getDefaultBookmarkStats: (...args: unknown[]) => getDefaultBookmarkStatsMock(...args),
}))

const ensureCollectionAssignmentMock = vi.fn()
vi.mock("@/lib/bookmarks/collections", () => ({
  ensureBookmarkCollectionAssignment: (...args: unknown[]) => ensureCollectionAssignmentMock(...args),
}))

const applyCounterDeltaMock = vi.fn()
vi.mock("@/lib/bookmarks/counters", () => ({
  applyBookmarkCounterDelta: (...args: unknown[]) => applyCounterDeltaMock(...args),
}))

describe("bookmark service contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureCollectionAssignmentMock.mockResolvedValue(null)
    applyCounterDeltaMock.mockResolvedValue(undefined)
    fetchBookmarkStatsMock.mockResolvedValue({
      total: 1,
      unread: 1,
      categories: {},
      readStates: { unread: 1 },
      collections: {},
    })
  })

  it("lists bookmarks using filters and pagination cursor", async () => {
    const { listBookmarksForUser } = await import("./service")
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    }

    executeListQueryMock.mockImplementationOnce((_, __, callback) => {
      callback(builder)
      return {
        data: [{ id: "b1", createdAt: "2024-01-01", editionCode: null, collectionId: null, readState: "unread" }],
        error: null,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only lightweight client stub.
    const payload = await listBookmarksForUser({} as any, "user-1", {
      limit: 10,
      search: "hello",
      sortBy: "created_at",
      sortOrder: "desc",
    })

    expect(payload.bookmarks).toHaveLength(1)
    expect(payload.pagination.limit).toBe(10)
    expect(builder.limit).toHaveBeenCalledWith(11)
    expect(fetchBookmarkStatsMock).toHaveBeenCalledWith({}, "user-1")
  })

  it("adds bookmark and invalidates cache tags", async () => {
    const { addBookmarkForUser } = await import("./service")
    const revalidate = vi.fn()

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "b1", editionCode: "ng", collectionId: "c1", readState: "unread", category: "news" }, error: null }),
    }

    const supabase = {
      from: vi.fn().mockImplementationOnce(() => existingChain).mockImplementationOnce(() => insertChain),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only lightweight client stub.
    const payload = await addBookmarkForUser(supabase as any, "user-1", { postId: "post-1" }, { revalidate, editionHints: ["ng"] })

    expect(payload.added).toHaveLength(1)
    expect(applyCounterDeltaMock).toHaveBeenCalled()
    expect(revalidate).toHaveBeenCalled()
  })

  it("updates bookmark and returns mutation delta", async () => {
    const { updateBookmarkForUser } = await import("./service")
    const loadChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "b1", collectionId: "c1", readState: "unread", editionCode: "ng" }, error: null }),
    }
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "b1", collectionId: "c2", readState: "read", editionCode: "ng" }, error: null }),
    }
    const supabase = {
      from: vi.fn().mockImplementationOnce(() => loadChain).mockImplementationOnce(() => updateChain),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only lightweight client stub.
    const payload = await updateBookmarkForUser(supabase as any, "user-1", "post-1", { readState: "read" })
    expect(payload.updated).toHaveLength(1)
    expect(payload.statsDelta.total).toBe(0)
  })

  it("bulk removes bookmarks", async () => {
    const { bulkRemoveBookmarksForUser } = await import("./service")
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: "b1", readState: "unread", category: "tech", editionCode: "za", collectionId: null }], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(deleteChain) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only lightweight client stub.
    const payload = await bulkRemoveBookmarksForUser(supabase as any, "user-1", ["post-1", "post-2"])
    expect(payload.removed).toHaveLength(1)
    expect(deleteChain.in).toHaveBeenCalledWith("wp_post_id", ["post-1", "post-2"])
  })
})
