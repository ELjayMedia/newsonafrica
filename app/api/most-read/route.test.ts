import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout"

vi.mock("@/lib/utils/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}))

describe("GET /api/most-read", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("decodes HTML entities from upstream responses", async () => {
    const upstreamPosts = [
      {
        id: 456,
        slug: "world-update",
        title: { rendered: "World&#39;s leaders" },
        excerpt: { rendered: "It&#39;s official" },
        date: "2024-06-10",
      },
    ]

    vi.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: async () => ({ posts: upstreamPosts }),
    } as Response)

    const response = await GET(new Request("https://example.com/api/most-read?country=sz"))
    const payload = (await response.json()) as Array<{ title: string; excerpt: string }>

    expect(payload).toHaveLength(1)
    expect(payload[0].title).toBe("World's leaders")
    expect(payload[0].excerpt).toBe("It's official")
  })
})
