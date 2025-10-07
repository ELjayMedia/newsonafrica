import { beforeEach, describe, expect, it, vi } from "vitest"

const getPostsByCountryMock = vi.hoisted(() => vi.fn()) as ReturnType<typeof vi.fn>
const getLatestPostsForCountryMock = vi.hoisted(() => vi.fn()) as ReturnType<typeof vi.fn>

vi.mock("@/lib/api-utils", () => ({
  jsonWithCors: vi.fn((req: Request, data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), init),
  ),
  logRequest: vi.fn(),
}))

vi.mock("@/lib/wp-data", () => ({
  getPostsByCountry: getPostsByCountryMock,
  normalizeCountryCode: (country?: string | null) => {
    const defaultSlug = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()
    if (!country) return defaultSlug
    const normalized = country.toLowerCase()
    if (normalized === "default") {
      return defaultSlug
    }
    return normalized
  },
}))

vi.mock("@/lib/wordpress-api", () => ({
  getLatestPostsForCountry: getLatestPostsForCountryMock,
  getPostsByCategoryForCountry: vi.fn(),
}))

import { GET } from "./route"

describe("GET /api/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "ke"
    getPostsByCountryMock.mockRejectedValue(new Error("GraphQL query failed"))
    getLatestPostsForCountryMock.mockResolvedValue({
      posts: [],
      hasNextPage: false,
      endCursor: null,
    })
  })

  it("uses the default site slug when falling back without a country parameter", async () => {
    const request = new Request("https://example.com/api/posts")

    await GET(request)

    expect(getLatestPostsForCountryMock).toHaveBeenCalledWith("ke", 20)
  })
})
