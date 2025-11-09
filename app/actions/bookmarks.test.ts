import { beforeEach, describe, expect, it, vi } from "vitest"

import { cacheTags } from "@/lib/cache"

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
}))

const executeListQueryMock = vi.fn()
vi.mock("@/lib/supabase/list-query", () => ({
  executeListQuery: executeListQueryMock,
}))

const fetchBookmarkStatsMock = vi.fn()
const getDefaultBookmarkStatsMock = vi.fn()
vi.mock("@/lib/bookmarks/stats", () => ({
  fetchBookmarkStats: fetchBookmarkStatsMock,
  getDefaultBookmarkStats: getDefaultBookmarkStatsMock,
}))

const derivePaginationMock = vi.fn()
vi.mock("@/lib/bookmarks/pagination", () => ({
  derivePagination: derivePaginationMock,
}))

const supabaseRef: { current: any } = { current: null }

vi.mock("@/app/actions/supabase", () => ({
  withSupabaseSession: async (callback: any) => {
    if (!supabaseRef.current) {
      throw new Error("Supabase mock not configured")
    }

    const data = await callback({
      supabase: supabaseRef.current,
      session: { user: { id: "user-1" } },
    })

    return { data, error: null }
  },
}))

describe("bookmark actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    executeListQueryMock.mockReset()
    fetchBookmarkStatsMock.mockReset()
    getDefaultBookmarkStatsMock.mockReset()
    derivePaginationMock.mockReset()
  })

  it("revalidates bookmark tags when listing with revalidate=true", async () => {
    supabaseRef.current = {}
    executeListQueryMock.mockResolvedValueOnce({ data: [], error: null })
    getDefaultBookmarkStatsMock.mockReturnValue({ total: 0, unread: 0, categories: {} })
    derivePaginationMock.mockReturnValue({ items: [] })

    const { listBookmarks } = await import("./bookmarks")

    const result = await listBookmarks({ revalidate: true })

    expect(result.error).toBeNull()
    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateTagMock).toHaveBeenCalledWith(cacheTags.bmUser("user-1"))
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("revalidates bookmark tags after adding a bookmark", async () => {
    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }

    const insertedRow = {
      id: "bookmark-1",
      user_id: "user-1",
      post_id: "post-1",
      created_at: new Date().toISOString(),
      read_status: "unread" as const,
      category: "news",
      tags: null,
      title: "Sample",
      slug: "sample",
      excerpt: "",
      featured_image: null,
      notes: null,
      country: null,
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedRow }),
    }

    supabaseRef.current = {
      from: vi
        .fn()
        .mockImplementationOnce(() => existingChain)
        .mockImplementationOnce(() => insertChain),
    }

    const { addBookmark } = await import("./bookmarks")

    const result = await addBookmark({ postId: "post-1" })

    expect(result.error).toBeNull()
    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateTagMock).toHaveBeenCalledWith(cacheTags.bmUser("user-1"))
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("revalidates bookmark tags after removing a bookmark", async () => {
    const removedRow = {
      id: "bookmark-2",
      user_id: "user-1",
      post_id: "post-2",
      created_at: new Date().toISOString(),
      read_status: "unread" as const,
      category: "tech",
      tags: null,
      title: "Sample",
      slug: "sample",
      excerpt: "",
      featured_image: null,
      notes: null,
      country: null,
    }

    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [removedRow], error: null }),
    }

    supabaseRef.current = {
      from: vi.fn().mockReturnValue(deleteChain),
    }

    const { removeBookmark } = await import("./bookmarks")

    const result = await removeBookmark("post-2")

    expect(result.error).toBeNull()
    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateTagMock).toHaveBeenCalledWith(cacheTags.bmUser("user-1"))
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
