import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const applyCookiesMock = vi.fn((response: Response) => response)

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}))

const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    listBookmarksForUser: vi.fn(),
    addBookmarkForUser: vi.fn(),
    updateBookmarkForUser: vi.fn(),
    bulkRemoveBookmarksForUser: vi.fn(),
  },
}))

vi.mock("@/lib/bookmarks/service", () => serviceMocks)

import { createSupabaseRouteClient } from "@/lib/supabase/route"
import { GET, POST } from "./route"

describe("/api/bookmarks route transport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) } } as any,
      applyCookies: applyCookiesMock,
    })
    serviceMocks.listBookmarksForUser.mockResolvedValue({
      bookmarks: [],
      stats: null,
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    })
    serviceMocks.addBookmarkForUser.mockResolvedValue({
      added: [],
      statsDelta: { total: 0, unread: 0, categories: {}, readStates: {}, collections: {} },
    })
  })

  it("GET delegates to shared service and returns payload", async () => {
    const response = await GET(new NextRequest("https://example.com/api/bookmarks?limit=5"))
    expect(response.status).toBe(200)
    expect(serviceMocks.listBookmarksForUser).toHaveBeenCalledWith(expect.anything(), "user-1", expect.objectContaining({ limit: 5 }))
  })

  it("POST unwraps payload and delegates to shared service", async () => {
    const response = await POST(
      new NextRequest("https://example.com/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ action: { payload: { postId: "post-1" } } }),
      }),
    )

    expect(response.status).toBe(200)
    expect(serviceMocks.addBookmarkForUser).toHaveBeenCalledWith(expect.anything(), "user-1", expect.objectContaining({ postId: "post-1" }), expect.any(Object))
  })
})
