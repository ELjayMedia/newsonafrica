// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

let middleware: typeof import("@/middleware")["middleware"]

beforeAll(async () => {
  ;({ middleware } = await import("@/middleware"))
})

describe("legacy post redirect", () => {
  it("uses the preferredCountry cookie when present", () => {
    const req = new NextRequest("https://example.com/post/some-slug", {
      headers: { cookie: "preferredCountry=za" },
    })
    const res = middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      "https://example.com/za/article/some-slug",
    )
  })

  it("falls back to the default country when no cookie exists", () => {
    const req = new NextRequest("https://example.com/post/another")
    const res = middleware(req)

    expect(res?.headers.get("location")).toBe(
      `https://example.com/${DEFAULT_COUNTRY}/article/another`,
    )
  })

  it("ignores unsupported preferredCountry values", () => {
    const req = new NextRequest("https://example.com/post/third", {
      headers: { cookie: "preferredCountry=xx" },
    })
    const res = middleware(req)

    expect(res?.headers.get("location")).toBe(
      `https://example.com/${DEFAULT_COUNTRY}/article/third`,
    )
  })
})
