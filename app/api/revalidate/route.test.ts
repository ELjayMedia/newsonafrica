import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    applyRateLimit: vi.fn().mockResolvedValue(null),
    logRequest: vi.fn(),
  }
})

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache/cacheTags"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import { POST } from "./route"

const SECRET = "test-secret"

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest("https://example.com/api/revalidate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })

describe("/api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REVALIDATION_SECRET = SECRET
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  it("revalidates article caches and related taxonomies", async () => {
    const request = createRequest({
      secret: SECRET,
      slug: "My-Story",
      postId: 77,
      country: "ng",
      categories: ["Politics", "politics"],
      tags: ["Breaking", "finance"],
      sections: ["news"],
    })

    await POST(request)

    const tagCalls = vi.mocked(revalidateTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.edition("ng"),
        cacheTags.home("ng"),
        cacheTags.post("ng", "77"),
        cacheTags.category("ng", "politics"),
        cacheTags.tag("ng", "breaking"),
        cacheTags.tag("ng", "finance"),
      ]),
    )
  })

  it("uses the default country when none is provided and revalidates explicit paths and sections", async () => {
    const request = createRequest({
      secret: SECRET,
      slug: "latest-update",
      sections: ["frontpage", "FrontPage"],
    })

    await POST(request)

    const tagCalls = vi.mocked(revalidateTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.edition(DEFAULT_COUNTRY),
        cacheTags.home(DEFAULT_COUNTRY),
        cacheTags.post(DEFAULT_COUNTRY, "latest-update"),
      ]),
    )
  })
})
