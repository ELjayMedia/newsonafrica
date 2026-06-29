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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double for a minimal Supabase client surface.
      supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) } } as any,
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

  it("GET returns standard envelope", async () => {
    const response = await GET(new NextRequest("https://example.com/api/bookmarks?limit=5"), undefined as never)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        bookmarks: [],
        stats: null,
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      error: null,
    })
    expect(serviceMocks.listBookmarksForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ limit: 5 }),
    )
  })

  it("POST returns standard envelope", async () => {
    const response = await POST(
      new NextRequest("https://example.com/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ action: { payload: { postId: "post-1" } } }),
      }),
      undefined as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        added: [],
        statsDelta: { total: 0, unread: 0, categories: {}, readStates: {}, collections: {} },
      },
      error: null,
    })
    expect(serviceMocks.addBookmarkForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ postId: "post-1" }),
      expect.any(Object),
    )
  })
})
