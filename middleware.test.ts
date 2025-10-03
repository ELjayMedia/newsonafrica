// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/legacy-routes", () => ({
  getLegacyPostRoute: vi.fn(),
}))

let middleware: typeof import("@/middleware")["middleware"]
let getLegacyPostRoute: typeof import("@/lib/legacy-routes")["getLegacyPostRoute"]

beforeAll(async () => {
  ;({ middleware } = await import("@/middleware"))
  ;({ getLegacyPostRoute } = await import("@/lib/legacy-routes"))
})

describe("legacy post redirect", () => {
  beforeEach(() => {
    vi.mocked(getLegacyPostRoute).mockReset()
    vi.mocked(getLegacyPostRoute).mockResolvedValue(null)
  })

  it("redirects when the KV entry matches the resolved country", async () => {
    vi.mocked(getLegacyPostRoute).mockResolvedValue({
      slug: "some-slug",
      country: "za",
      primaryCategory: "news",
    })

    const req = new NextRequest("https://example.com/post/some-slug", {
      headers: { cookie: "preferredCountry=za" },
    })
    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      "https://example.com/za/news/some-slug",
    )
    expect(getLegacyPostRoute).toHaveBeenCalledWith("some-slug")
  })

  it("falls through when the stored country does not match", async () => {
    vi.mocked(getLegacyPostRoute).mockResolvedValue({
      slug: "some-slug",
      country: "sz",
      primaryCategory: "news",
    })

    const req = new NextRequest("https://example.com/post/some-slug", {
      headers: { cookie: "preferredCountry=za" },
    })
    const res = await middleware(req)

    expect(res?.headers.get("location")).toBeNull()
  })

  it("falls through when no KV entry exists", async () => {
    const req = new NextRequest("https://example.com/post/missing", {
      headers: { cookie: "preferredCountry=za" },
    })
    const res = await middleware(req)

    expect(res?.headers.get("location")).toBeNull()
    expect(getLegacyPostRoute).toHaveBeenCalledWith("missing")
  })
})
