import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/wordpress-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wordpress-api")>("@/lib/wordpress-api")
  return {
    ...actual,
    fetchRecentPosts: vi.fn().mockResolvedValue([{ id: "recent-1", title: "Recent" }]),
  }
})

import { GET } from "./route"

const buildAnalyticsResponse = () => [
  {
    id: 1,
    slug: "popular-story",
    title: { rendered: "Popular Story" },
    excerpt: { rendered: "A summary" },
    date: "2024-01-01",
  },
]

describe("GET /api/sidebar", () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    ;(globalThis as any).window = originalWindow
  })

  it("returns most-read posts from the analytics endpoint on the server", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString()
      if (url.includes("/api/most-read")) {
        return new Response(JSON.stringify(buildAnalyticsResponse()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      throw new Error(`Unhandled fetch request: ${url}`)
    })

    vi.stubGlobal("fetch", fetchMock)
    ;(globalThis as any).window = undefined

    const response = await GET(new Request("https://example.com/api/sidebar?country=sz"))
    expect(response.status).toBe(200)

    const payload = (await response.json()) as { mostRead: Array<{ slug: string; title: string }> }

    expect(payload.mostRead).toHaveLength(1)
    expect(payload.mostRead[0].slug).toBe("popular-story")
    expect(payload.mostRead[0].title).toBe("Popular Story")

    const firstCallArg = fetchMock.mock.calls[0]?.[0]
    const requestedUrl =
      typeof firstCallArg === "string"
        ? firstCallArg
        : firstCallArg instanceof Request
          ? firstCallArg.url
          : firstCallArg?.toString?.() ?? ""

    expect(requestedUrl.startsWith("http")).toBe(true)
  })
})
