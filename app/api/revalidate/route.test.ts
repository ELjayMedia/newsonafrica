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

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { revalidateByTag } from "@/lib/server-cache-utils"
import { revalidatePath } from "next/cache"
import { cacheTags } from "@/lib/cache"
import { DEFAULT_COUNTRY, getArticleUrl } from "@/lib/utils/routing"
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

    expect(revalidatePath).toHaveBeenCalledWith(getArticleUrl("my-story", "ng"))

    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.posts("ng"),
        cacheTags.categories("ng"),
        cacheTags.tags("ng"),
        cacheTags.postSlug("ng", "my-story"),
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
      path: "/extra-path",
      sections: ["frontpage", "FrontPage"],
    })

    await POST(request)

    expect(revalidatePath).toHaveBeenCalledWith(getArticleUrl("latest-update", DEFAULT_COUNTRY))
    expect(revalidatePath).toHaveBeenCalledWith("/extra-path")

    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.posts(DEFAULT_COUNTRY),
        cacheTags.categories(DEFAULT_COUNTRY),
        cacheTags.tags(DEFAULT_COUNTRY),
        "country:" + DEFAULT_COUNTRY,
        "section:frontpage",
      ]),
    )
  })
})
