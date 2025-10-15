import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET, revalidate } from "./route"
import { getLatestPostsForCountry, mapPostsToHomePosts } from "@/lib/wordpress-api"
import type { PanAfricanSpotlightPayload } from "@/types/home"

vi.mock("@/lib/wordpress-api", () => ({
  getLatestPostsForCountry: vi.fn(),
  mapPostsToHomePosts: vi.fn(),
}))

describe("GET /api/pan-african-spotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns mapped posts for the requested country", async () => {
    vi.mocked(getLatestPostsForCountry).mockResolvedValue({ posts: [{ id: 1 }] } as any)
    const mappedPosts = [
      {
        id: "1",
        slug: "example-story",
        title: "Example Story",
        excerpt: "Excerpt",
        date: "2024-01-01",
        country: "ng",
      },
    ]
    vi.mocked(mapPostsToHomePosts).mockReturnValue(mappedPosts)

    const response = await GET(
      new Request("https://example.com/api/pan-african-spotlight?country=NG&limit=2"),
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as PanAfricanSpotlightPayload
    expect(payload).toEqual({ country: "ng", posts: mappedPosts })

    expect(getLatestPostsForCountry).toHaveBeenCalledWith("ng", 2)
    expect(mapPostsToHomePosts).toHaveBeenCalledWith([{ id: 1 }], "ng")
    expect(response.headers.get("cache-control")).toContain(`s-maxage=${revalidate}`)
    expect(response.headers.get("x-next-cache-tags")).toContain("country:ng")
  })

  it("validates the country parameter", async () => {
    const response = await GET(new Request("https://example.com/api/pan-african-spotlight"))
    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain("Missing country")
  })

  it("handles upstream failures", async () => {
    vi.mocked(getLatestPostsForCountry).mockRejectedValue(new Error("boom"))
    const response = await GET(new Request("https://example.com/api/pan-african-spotlight?country=za"))

    expect(response.status).toBe(500)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toBe("Failed to load spotlight posts")
  })
})
