import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: vi.fn(),
  revalidateMultiplePaths: vi.fn(),
}))

import { createClient } from "@/utils/supabase/server"
import { revalidateByTag, revalidateMultiplePaths } from "@/lib/server-cache-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { DELETE, POST, PUT } from "./route"

describe("/api/bookmarks cache revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReset()
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

    vi.mocked(createClient).mockReturnValueOnce(supabase as any)

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ postId: "post-1" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(revalidateByTag).toHaveBeenCalledTimes(1)
    expect(revalidateByTag).toHaveBeenCalledWith(CACHE_TAGS.BOOKMARKS)
    expect(revalidateMultiplePaths).not.toHaveBeenCalled()
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

    vi.mocked(createClient).mockReturnValueOnce(supabase as any)

    const request = new NextRequest("https://example.com/api/bookmarks", {
      method: "PUT",
      body: JSON.stringify({ postId: "post-2", updates: { notes: "updated" } }),
      headers: { "content-type": "application/json" },
    })

    const response = await PUT(request)

    expect(response.status).toBe(200)
    expect(revalidateByTag).toHaveBeenCalledTimes(1)
    expect(revalidateByTag).toHaveBeenCalledWith(CACHE_TAGS.BOOKMARKS)
    expect(revalidateMultiplePaths).not.toHaveBeenCalled()
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

    vi.mocked(createClient).mockReturnValueOnce(supabase as any)

    const request = new NextRequest("https://example.com/api/bookmarks?postId=post-3", {
      method: "DELETE",
    })

    const response = await DELETE(request)

    expect(response.status).toBe(200)
    expect(revalidateByTag).toHaveBeenCalledTimes(1)
    expect(revalidateByTag).toHaveBeenCalledWith(CACHE_TAGS.BOOKMARKS)
    expect(revalidateMultiplePaths).not.toHaveBeenCalled()
  })
})
