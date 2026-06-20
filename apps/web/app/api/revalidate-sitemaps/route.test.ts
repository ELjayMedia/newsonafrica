import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const revalidatePathMock = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

describe("/api/revalidate-sitemaps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REVALIDATION_SECRET = "test-secret"
  })

  it("revalidates metadata and index sitemap routes when secret is valid", async () => {
    const request = new NextRequest("https://example.com/api/revalidate-sitemaps?secret=test-secret")

    const { GET } = await import("./route")
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap-index.xml")
  })

  it("rejects requests with an invalid secret", async () => {
    const request = new NextRequest("https://example.com/api/revalidate-sitemaps?secret=wrong")

    const { GET } = await import("./route")
    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
