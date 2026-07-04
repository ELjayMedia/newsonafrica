import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const listAdminCommentsServiceMock = vi.fn()
const adminUpdateCommentServiceMock = vi.fn()

vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>()
  return { ...actual, REVALIDATION_SECRET: "admin-secret" }
})

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ admin: true })),
}))

vi.mock("@/lib/comments/service", () => ({
  listAdminCommentsService: listAdminCommentsServiceMock,
  adminUpdateCommentService: adminUpdateCommentServiceMock,
}))

describe("/api/admin/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns envelope-shaped unauthorized responses", async () => {
    const { GET } = await import("./route")
    const response = await GET(new NextRequest("https://example.com/api/admin/comments"), undefined as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ data: null, error: "Unauthorized" })
  })

  it("returns envelope-shaped list responses", async () => {
    listAdminCommentsServiceMock.mockResolvedValueOnce([
      {
        id: "comment-1",
        wp_post_id: "100",
        body: "hello",
        user_id: "user-1",
        edition_code: "ng",
        status: "active",
        created_at: "2025-01-01T00:00:00.000Z",
      },
    ])

    const { GET } = await import("./route")
    const response = await GET(
      new NextRequest("https://example.com/api/admin/comments?status=approved", {
        headers: { "x-admin-token": "admin-secret" },
      }),
      undefined as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "comment-1",
          wp_post_id: 100,
          content: "hello",
          created_by: "user-1",
          edition: "ng",
          status: "active",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    })
  })

  it("returns envelope-shaped PATCH responses", async () => {
    adminUpdateCommentServiceMock.mockResolvedValueOnce({})

    const { PATCH } = await import("./route")
    const response = await PATCH(
      new NextRequest("https://example.com/api/admin/comments?id=comment-1", {
        method: "PATCH",
        headers: { "x-admin-token": "admin-secret", "content-type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      undefined as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: { success: true }, error: null })
  })
})
