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
import { CACHE_TAGS } from "@/lib/cache/constants"
import { cacheTags } from "@/lib/cache"
import { GET } from "./route"

const SECRET = "test-secret"

describe("/api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REVALIDATION_SECRET = SECRET
  })

  it("revalidates the expanded content tags when type=content", async () => {
    const request = new NextRequest(
      `https://example.com/api/revalidate?secret=${SECRET}&type=content`,
    )

    await GET(request)

    expect(revalidatePath).toHaveBeenCalled()
    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        CACHE_TAGS.POSTS,
        CACHE_TAGS.CATEGORIES,
        CACHE_TAGS.FEATURED,
        CACHE_TAGS.TRENDING,
        CACHE_TAGS.TAGS,
      ]),
    )
  })

  it("revalidates tag-specific caches when tagSlug and country are provided", async () => {
    const request = new NextRequest(
      `https://example.com/api/revalidate?secret=${SECRET}&tagSlug=finance&country=za`,
    )

    await GET(request)

    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.tags("za"),
        cacheTags.tag("za", "finance"),
      ]),
    )
    expect(tagCalls).not.toContain(CACHE_TAGS.POSTS)
  })

  it("revalidates category caches when categorySlug is provided", async () => {
    const request = new NextRequest(
      `https://example.com/api/revalidate?secret=${SECRET}&country=ng&categorySlug=politics`,
    )

    await GET(request)

    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.categories("ng"),
        cacheTags.category("ng", "politics"),
      ]),
    )
  })

  it("revalidates post caches when post identifiers are provided", async () => {
    const request = new NextRequest(
      `https://example.com/api/revalidate?secret=${SECRET}&country=ng&postSlug=My-Story&postId=77`,
    )

    await GET(request)

    const tagCalls = vi.mocked(revalidateByTag).mock.calls.flat()
    expect(tagCalls).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug("ng", "my-story"),
        cacheTags.post("ng", "77"),
      ]),
    )
  })
})
