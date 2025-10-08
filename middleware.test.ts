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
    expect(res?.cookies.get("preferredCountry")?.value).toBe("za")
    expect(getLegacyPostRoute).toHaveBeenCalledWith("some-slug")
  })

  it("redirects to the stored country when it differs from the cookie", async () => {
    vi.mocked(getLegacyPostRoute).mockResolvedValue({
      slug: "some-slug",
      country: "sz",
      primaryCategory: "news",
    })

    const req = new NextRequest("https://example.com/post/some-slug", {
      headers: { cookie: "preferredCountry=za" },
    })
    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      "https://example.com/sz/news/some-slug",
    )
    expect(res?.cookies.get("preferredCountry")?.value).toBe("sz")
  })

  it("redirects to the stored country when no cookie is present", async () => {
    vi.mocked(getLegacyPostRoute).mockResolvedValue({
      slug: "some-slug",
      country: "sz",
      primaryCategory: "news",
    })

    const req = new NextRequest("https://example.com/post/some-slug")
    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      "https://example.com/sz/news/some-slug",
    )
    expect(res?.cookies.get("preferredCountry")?.value).toBe("sz")
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

describe("API CORS handling", () => {
  const allowedOrigin = "http://localhost:3000"
  const disallowedOrigin = "https://malicious.example"

  it("applies CORS headers for allowed origins", async () => {
    const req = new NextRequest("https://example.com/api/test", {
      headers: { origin: allowedOrigin },
    })

    const res = await middleware(req)

    expect(res?.headers.get("access-control-allow-origin")).toBe(allowedOrigin)
    expect(res?.headers.get("access-control-allow-methods")).toContain("OPTIONS")
  })

  it("omits CORS headers for disallowed origins", async () => {
    const req = new NextRequest("https://example.com/api/test", {
      headers: { origin: disallowedOrigin },
    })

    const res = await middleware(req)

    expect(res?.headers.get("access-control-allow-origin")).toBeNull()
  })

  it("short-circuits OPTIONS requests for allowed origins", async () => {
    const req = new NextRequest("https://example.com/api/test", {
      method: "OPTIONS",
      headers: { origin: allowedOrigin },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(204)
    expect(res?.headers.get("access-control-allow-origin")).toBe(allowedOrigin)
  })

  it("rejects OPTIONS requests for disallowed origins", async () => {
    const req = new NextRequest("https://example.com/api/test", {
      method: "OPTIONS",
      headers: { origin: disallowedOrigin },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(403)
    expect(res?.headers.get("access-control-allow-origin")).toBeNull()
  })
})
