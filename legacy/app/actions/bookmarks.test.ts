import { beforeEach, describe, expect, it, vi } from "vitest"

const revalidateTagMock = vi.fn()
vi.mock("next/cache", () => ({ revalidateTag: revalidateTagMock }))

const serviceMocks = {
  listBookmarksForUser: vi.fn(),
  addBookmarkForUser: vi.fn(),
  updateBookmarkForUser: vi.fn(),
  removeBookmarkForUser: vi.fn(),
  bulkRemoveBookmarksForUser: vi.fn(),
}
vi.mock("@/lib/bookmarks/service", () => serviceMocks)

const supabaseRef: { current: any } = { current: null }
vi.mock("@/app/actions/supabase", () => ({
  withSupabaseSession: async (callback: any) => {
    const data = await callback({ supabase: supabaseRef.current, session: { user: { id: "user-1" } } })
    return { data, error: null }
  },
}))

describe("bookmark actions transport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseRef.current = {}
    serviceMocks.listBookmarksForUser.mockResolvedValue({ bookmarks: [], stats: null, pagination: { limit: 1, hasMore: false, nextCursor: null } })
    serviceMocks.addBookmarkForUser.mockResolvedValue({ added: [], statsDelta: { total: 0, unread: 0, categories: {}, readStates: {}, collections: {} } })
  })

  it("delegates listBookmarks to service", async () => {
    const { listBookmarks } = await import("./bookmarks")
    const result = await listBookmarks()
    expect(result.error).toBeNull()
    expect(serviceMocks.listBookmarksForUser).toHaveBeenCalledWith({}, "user-1", expect.any(Object))
  })

  it("delegates addBookmark to service with cache revalidation callback", async () => {
    const { addBookmark } = await import("./bookmarks")
    const result = await addBookmark({ postId: "post-1" })
    expect(result.error).toBeNull()
    expect(serviceMocks.addBookmarkForUser).toHaveBeenCalledWith({}, "user-1", expect.objectContaining({ postId: "post-1" }), expect.objectContaining({ revalidate: expect.any(Function) }))
  })
})
