import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

vi.mock("@/config/env", () => ({
  ENV: {
    NEXT_PUBLIC_DEFAULT_SITE: "sz",
    NEXT_PUBLIC_SITE_URL: "https://newsonafrica.com",
  },
  REVALIDATION_SECRET: "test-secret",
  WORDPRESS_WEBHOOK_SECRET: "",
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
  })

  it("revalidates canonical article, edition, home and taxonomy tags", async () => {
    const request = createRequest({
      secret: SECRET,
      slug: "My-Story",
      postId: 77,
      country: "ng",
      categories: ["Politics", "politics"],
      tags: ["Breaking", "finance"],
    })

    await POST(request)

    expect(vi.mocked(revalidateTag).mock.calls.map(([value]) => value)).toEqual([
      cacheTags.edition("ng"),
      cacheTags.home("ng"),
      cacheTags.post("ng", "77"),
      cacheTags.postSlug("ng", "my-story"),
      cacheTags.category("ng", "politics"),
      cacheTags.tag("ng", "breaking"),
      cacheTags.tag("ng", "finance"),
    ])
  })

  it("falls back to default country and slug-based post id", async () => {
    const request = createRequest({
      secret: SECRET,
      slug: "latest-update",
      sections: ["frontpage"],
    })

    await POST(request)

    expect(vi.mocked(revalidateTag).mock.calls.map(([value]) => value)).toEqual([
      cacheTags.edition(DEFAULT_COUNTRY),
      cacheTags.home(DEFAULT_COUNTRY),
      cacheTags.post(DEFAULT_COUNTRY, "latest-update"),
      cacheTags.postSlug(DEFAULT_COUNTRY, "latest-update"),
    ])
  })
})
