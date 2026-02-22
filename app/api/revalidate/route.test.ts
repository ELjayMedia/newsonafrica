import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
}))

describe("/api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REVALIDATION_SECRET = "test-secret"
  })

  it("revalidates sitemap routes on successful content revalidation", async () => {
    const request = new NextRequest("https://example.com/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Revalidate-Secret": "test-secret",
      },
      body: JSON.stringify({ countryCode: "ng", slug: "story" }),
    })

    const { POST } = await import("./route")
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalled()
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap-index.xml")
  })
})
