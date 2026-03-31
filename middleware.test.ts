// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

let middleware: typeof import("@/middleware")["middleware"]

beforeAll(async () => {
  ;({ middleware } = await import("@/middleware"))
})

describe("category redirects", () => {
  it("uses the country cookie for direct visits", async () => {
    const req = new NextRequest("https://example.com/news", {
      headers: { cookie: "country=za" },
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

describe("home redirects", () => {
  it("allows the new landing page to load when no legacy flag is provided", async () => {
    const req = new NextRequest("https://example.com/")

    const res = await middleware(req)

    expect(res?.headers.get("location")).toBeNull()
    expect(res?.status).toBe(200)
  })

  it("redirects when the legacy query flag is present", async () => {
    const req = new NextRequest("https://example.com/?legacyRedirect=1", {
      headers: { cookie: "country=za" },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe("https://example.com/za")
  })

  it("respects the legacy preferredCountry cookie when forced to redirect", async () => {
    const req = new NextRequest("https://example.com/?legacyRedirect=1", {
      headers: { cookie: "preferredCountry=sz" },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe("https://example.com/sz")
  })

  it("redirects when the cookie flag is present", async () => {
    const req = new NextRequest("https://example.com/", {
      headers: { cookie: "country=za; forceLegacyHomeRedirect=true" },
    })

    const res = await middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe("https://example.com/za")
  })
})
