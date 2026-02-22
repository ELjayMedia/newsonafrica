import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { cacheTags } from "@/lib/cache/cacheTags"

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()


vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>()
  return {
    ...actual,
    REVALIDATION_SECRET: "test-secret",
    WORDPRESS_WEBHOOK_SECRET: undefined,
  }
})

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
}))

describe("/api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("revalidates canonical tags and sitemap routes", async () => {
    const request = new NextRequest("https://example.com/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Revalidate-Secret": "test-secret",
      },
      body: JSON.stringify({
        countryCode: "NG",
        slug: "My-Story",
        postId: 77,
        categories: ["Politics", "politics", "Business"],
        tags: ["Breaking", "breaking"],
      }),
    })

    const { POST } = await import("./route")
    const response = await POST(request)

    expect(response.status).toBe(200)

    expect(revalidateTagMock.mock.calls.map(([tag]) => tag)).toEqual([
      cacheTags.edition("ng"),
      cacheTags.home("ng"),
      cacheTags.post("ng", "77"),
      cacheTags.postSlug("ng", "my-story"),
      cacheTags.category("ng", "politics"),
      cacheTags.category("ng", "business"),
      cacheTags.tag("ng", "breaking"),
    ])

    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap-index.xml")
  })
})
