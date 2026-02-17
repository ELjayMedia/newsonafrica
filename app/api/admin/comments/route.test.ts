import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const listCommentsForModerationServerOnlyMock = vi.fn()
const updateCommentServerOnlyMock = vi.fn()

vi.mock("@/config/env", () => ({
  REVALIDATION_SECRET: "admin-secret",
}))

vi.mock("@/lib/supabase/rest/server/comments", () => ({
  listCommentsForModerationServerOnly: listCommentsForModerationServerOnlyMock,
  updateCommentServerOnly: updateCommentServerOnlyMock,
}))

describe("/api/admin/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(["pending", "active", "flagged", "deleted"])('filters by canonical "%s" status', async (status) => {
    listCommentsForModerationServerOnlyMock.mockResolvedValueOnce([])

    const { GET } = await import("./route")
    const request = new NextRequest(`https://example.com/api/admin/comments?status=${status}`, {
      headers: { "x-admin-token": "admin-secret" },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(listCommentsForModerationServerOnlyMock).toHaveBeenCalledWith({ status })
  })

  it.each([
    ["approved", "active"],
    ["rejected", "deleted"],
  ])('maps legacy "%s" filter to canonical "%s"', async (legacyStatus, canonicalStatus) => {
    listCommentsForModerationServerOnlyMock.mockResolvedValueOnce([])

    const { GET } = await import("./route")
    const request = new NextRequest(`https://example.com/api/admin/comments?status=${legacyStatus}`, {
      headers: { "x-admin-token": "admin-secret" },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(listCommentsForModerationServerOnlyMock).toHaveBeenCalledWith({ status: canonicalStatus })
  })

  it("rejects unsupported status filters", async () => {
    const { GET } = await import("./route")
    const request = new NextRequest("https://example.com/api/admin/comments?status=invalid", {
      headers: { "x-admin-token": "admin-secret" },
    })

    const response = await GET(request)

    expect(response.status).toBe(400)
    expect(listCommentsForModerationServerOnlyMock).not.toHaveBeenCalled()
  })

  it.each([
    ["pending", "pending"],
    ["active", "active"],
    ["flagged", "flagged"],
    ["deleted", "deleted"],
    ["approved", "active"],
    ["rejected", "deleted"],
  ])('normalizes PATCH status "%s" to "%s"', async (providedStatus, canonicalStatus) => {
    updateCommentServerOnlyMock.mockResolvedValueOnce({})

    const { PATCH } = await import("./route")
    const request = new NextRequest("https://example.com/api/admin/comments?id=comment-1", {
      method: "PATCH",
      headers: {
        "x-admin-token": "admin-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: providedStatus }),
    })

    const response = await PATCH(request)

    expect(response.status).toBe(200)
    expect(updateCommentServerOnlyMock).toHaveBeenCalledWith({
      id: "comment-1",
      updates: { status: canonicalStatus },
    })
  })
})
