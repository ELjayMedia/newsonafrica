import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(() => null),
}))

describe("/api/comments/[id] envelope", () => {
  it("returns service unavailable envelope", async () => {
    const { DELETE } = await import("./route")

    const response = await DELETE(
      new NextRequest("https://example.com/api/comments/comment-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "comment-1" }) },
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ data: null, error: "Supabase service unavailable" })
  })
})
