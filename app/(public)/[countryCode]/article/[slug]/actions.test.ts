import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateServerComponentSupabaseClient, mockListCommentsService } = vi.hoisted(() => ({
  mockCreateServerComponentSupabaseClient: vi.fn(),
  mockListCommentsService: vi.fn(),
}))

vi.mock("@/lib/comments/service", () => ({
  listCommentsService: (...args: unknown[]) => mockListCommentsService(...args),
}))

vi.mock("@/lib/supabase/server-component-client", () => ({
  createServerComponentSupabaseClient: () => mockCreateServerComponentSupabaseClient(),
}))

import { fetchCommentsPageAction } from "./actions"

describe("fetchCommentsPageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty state when supabase client is unavailable", async () => {
    mockCreateServerComponentSupabaseClient.mockReturnValue(null)

    const result = await fetchCommentsPageAction({ postId: "123", editionCode: "ng" })

    expect(result).toEqual({ comments: [], hasMore: false, nextCursor: null, total: 0 })
    expect(mockListCommentsService).not.toHaveBeenCalled()
  })

  it("returns paginated comments from the comments service", async () => {
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      },
    }
    mockCreateServerComponentSupabaseClient.mockReturnValue(supabase)
    mockListCommentsService.mockResolvedValue({
      comments: [{ id: "c1", body: "Hello" }],
      hasMore: true,
      nextCursor: "cursor-2",
      totalCount: 5,
    })

    const result = await fetchCommentsPageAction({
      postId: "42",
      editionCode: "ng",
      page: 1,
      pageSize: 20,
      cursor: "cursor-1",
    })

    expect(mockListCommentsService).toHaveBeenCalledWith(supabase, {
      wpPostId: "42",
      editionCode: "ng",
      page: 1,
      limit: 20,
      parentId: null,
      status: "active",
      cursor: "cursor-1",
      session: { user: { id: "u1" } },
    })

    expect(result).toEqual({
      comments: [{ id: "c1", body: "Hello" }],
      hasMore: true,
      nextCursor: "cursor-2",
      total: 5,
    })
  })
})
