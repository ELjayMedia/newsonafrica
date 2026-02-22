import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { cacheTags } from "@/lib/cache/cacheTags"

const revalidateByTagMock = vi.fn()

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: revalidateByTagMock,
}))

vi.mock("@/lib/cache/kv", () => ({
  kvCache: { delete: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock("@/lib/legacy-routes", () => ({
  setLegacyPostRoute: vi.fn().mockResolvedValue(undefined),
  deleteLegacyPostRoute: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/search", () => ({
  syncPostToIndex: vi.fn().mockResolvedValue(undefined),
  deletePostFromIndex: vi.fn().mockResolvedValue(undefined),
}))

describe("/api/webhooks/wordpress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("revalidates canonical tags for post updates", async () => {
    const request = new NextRequest("https://example.com/api/webhooks/wordpress", {
      method: "POST",
      body: JSON.stringify({
        action: "post_updated",
        post: {
          id: 77,
          slug: "my-story",
          country: "ng",
          terms: {
            category: [{ slug: "Politics" }],
            post_tag: [{ slug: "Breaking" }],
          },
        },
      }),
      headers: { "content-type": "application/json" },
    })

    const { POST } = await import("./route")
    await POST(request)

    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.edition("ng"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.home("ng"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.post("ng", "77"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.postSlug("ng", "my-story"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.category("ng", "politics"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.tag("ng", "breaking"))
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.home("all"))
  })

  it("revalidates canonical category tags", async () => {
    const request = new NextRequest("https://example.com/api/webhooks/wordpress", {
      method: "POST",
      body: JSON.stringify({
        action: "category_updated",
        post: { slug: "Business", country: "za" },
      }),
      headers: { "content-type": "application/json" },
    })

    const { POST } = await import("./route")
    await POST(request)

    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.category("za", "Business"))
  })
})
