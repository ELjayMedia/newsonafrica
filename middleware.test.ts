// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

vi.mock("@/lib/legacy-routes", () => ({
  getLegacyPostRoute: vi.fn(),
}))

let middleware: typeof import("@/middleware")["middleware"]
let getLegacyPostRoute: typeof import("@/lib/legacy-routes")["getLegacyPostRoute"]

beforeAll(async () => {
  ;({ middleware } = await import("@/middleware"))
  ;({ getLegacyPostRoute } = await import("@/lib/legacy-routes"))
})

beforeEach(() => {
  vi.mocked(getLegacyPostRoute).mockReset()
  vi.mocked(getLegacyPostRoute).mockResolvedValue(null)
})

describe("legacy post redirect", () => {

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

describe("category redirects", () => {
  it("uses the preferred country cookie for direct visits", async () => {
    const req = new NextRequest("https://example.com/news", {
      headers: { cookie: "preferredCountry=za" },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe("https://example.com/za/category/news")
  })

  it("falls back to the default country when no cookie is set", async () => {
    const req = new NextRequest("https://example.com/news")

    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      `https://example.com/${DEFAULT_COUNTRY}/category/news`,
    )
  })
})
