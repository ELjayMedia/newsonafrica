import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiRequestError, addComment, fetchComments } from "@/lib/comments/client"

describe("comment client adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("maps GET /api/comments envelope payloads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { comments: [{ id: "c-1" }], hasMore: true, nextCursor: "next", totalCount: 42 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    )

    const result = await fetchComments("post-1", "ng", 0, 10, "newest", undefined, "cursor-1")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/comments?wp_post_id=post-1&edition_code=ng&page=0&limit=10&sort=newest&cursor=cursor-1",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    )
    expect(result).toEqual({ comments: [{ id: "c-1" }], hasMore: true, nextCursor: "next", total: 42 })
  })

  it("surfaces structured ApiRequestError metadata", async () => {
    vi.spyOn(globalThis, "fetch" as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: "Rate limited. Please wait 3 seconds before commenting again.",
          meta: { rateLimit: { retryAfterSeconds: 3 } },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      ),
    )

    try {
      await addComment({
        wp_post_id: "post-1",
        edition_code: "ng",
        user_id: "user-1",
        body: "Hello",
        parent_id: null,
      })
      throw new Error("Expected addComment to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError)
      expect(error).toEqual(expect.objectContaining({ status: 429, retryAfterSeconds: 3 }))
    }
  })
})
