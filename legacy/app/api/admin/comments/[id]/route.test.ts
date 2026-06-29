import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const adminUpdateCommentServiceMock = vi.fn()
const revalidateTagMock = vi.fn()

vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>()
  return { ...actual, REVALIDATION_SECRET: "admin-secret" }
})

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ admin: true })),
}))

vi.mock("@/lib/comments/service", () => ({
  adminUpdateCommentService: adminUpdateCommentServiceMock,
}))

describe("PATCH /api/admin/comments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminUpdateCommentServiceMock.mockResolvedValue({
      cacheTag: "comments:ng:100",
      comment: {
        id: "comment-1",
        wp_post_id: "100",
        body: "updated",
        user_id: "user-1",
        edition_code: "ng",
        status: "active",
        created_at: "2025-01-01T00:00:00.000Z",
      },
    })
  })

  it("returns standardized envelope and revalidates cache", async () => {
    const { PATCH } = await import("./route")

    const response = await PATCH(
      new NextRequest("https://example.com/api/admin/comments/comment-1", {
        method: "PATCH",
        headers: {
          "x-admin-token": "admin-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: { id: "comment-1" } },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "comment-1",
        wp_post_id: 100,
        content: "updated",
        created_by: "user-1",
        edition: "ng",
        status: "active",
        created_at: "2025-01-01T00:00:00.000Z",
      },
      error: null,
    })
    expect(revalidateTagMock).toHaveBeenCalledWith("comments:ng:100")
  })
})
