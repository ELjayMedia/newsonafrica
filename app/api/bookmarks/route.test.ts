import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const applyCookiesMock = vi.fn((response: Response) => response)

vi.mock("@/utils/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}))

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: vi.fn(),
  revalidateMultiplePaths: vi.fn(),
}))

import { createSupabaseRouteClient } from "@/utils/supabase/route"
import { revalidateByTag, revalidateMultiplePaths } from "@/lib/server-cache-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { DELETE, GET, POST, PUT } from "./route"

function expectOnlyBookmarkTagInvalidation() {
  expect(revalidateByTag).toHaveBeenCalledTimes(1)
  expect(revalidateByTag).toHaveBeenCalledWith(CACHE_TAGS.BOOKMARKS)
  expect(revalidateMultiplePaths).not.toHaveBeenCalled()
}

describe("/api/bookmarks cache revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseRouteClient).mockReset()
    applyCookiesMock.mockImplementation((response: Response) => response)
  })

  it("only revalidates bookmark tags after creating a bookmark", async () => {
    const user = { id: "user-1" }

    const existingCheck = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "bookmark-1" } }),
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
      body: JSON.stringify({ postId: "post-1" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expectOnlyBookmarkTagInvalidation()
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("only revalidates bookmark tags after updating a bookmark", async () => {
    const user = { id: "user-2" }

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "bookmark-2" } }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(updateChain),
    }

    vi.mocked(createSupabaseRouteClient).mockReturnValueOnce({
      supabase: supabase as any,
      applyCookies: applyCookiesMock,
    })

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "PUT",
      body: JSON.stringify({ postId: "post-2", updates: { notes: "updated" } }),
      headers: { "content-type": "application/json" },
    })

    const response = await PUT(request)

    expect(response.status).toBe(200)
    expectOnlyBookmarkTagInvalidation()
    expect(applyCookiesMock).toHaveBeenCalledTimes(1)
  })

  it("only revalidates bookmark tags after deleting bookmarks", async () => {
    const user = { id: "user-3" }

    const deleteChain: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((onFulfilled: (value: { error: null }) => void) => {
        return Promise.resolve(onFulfilled({ error: null }))
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
    expectOnlyBookmarkTagInvalidation()
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
