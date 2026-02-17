import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const updateCommentServerOnlyMock = vi.fn()
const revalidateTagMock = vi.fn()

vi.mock("@/config/env", () => ({
  REVALIDATION_SECRET: "admin-secret",
}))

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}))

vi.mock("@/lib/cache", () => ({
  cacheTags: {
    comments: (editionCode: string, postId: string) => `comments:${editionCode}:${postId}`,
  },
}))

vi.mock("@/lib/supabase/rest/server/comments", () => ({
  updateCommentServerOnly: updateCommentServerOnlyMock,
}))

describe("PATCH /api/admin/comments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateCommentServerOnlyMock.mockResolvedValue({
      id: "comment-1",
      wp_post_id: "100",
      body: "updated",
      user_id: "user-1",
      edition_code: "ng",
      status: "active",
      created_at: "2025-01-01T00:00:00.000Z",
    })
  })

  it.each([
    ["pending", "pending"],
    ["active", "active"],
    ["flagged", "flagged"],
    ["deleted", "deleted"],
    ["approved", "active"],
    ["rejected", "deleted"],
  ])('normalizes status transition "%s" to "%s"', async (providedStatus, canonicalStatus) => {
    const { PATCH } = await import("./route")

    const request = new NextRequest("https://example.com/api/admin/comments/comment-1", {
      method: "PATCH",
      headers: {
        "x-admin-token": "admin-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: providedStatus }),
    })

    const response = await PATCH(request, { params: { id: "comment-1" } })

    expect(response.status).toBe(200)
    expect(updateCommentServerOnlyMock).toHaveBeenCalledWith({
      id: "comment-1",
      updates: { status: canonicalStatus },
    })
    expect(revalidateTagMock).toHaveBeenCalledWith("comments:ng:100")
  })
})
