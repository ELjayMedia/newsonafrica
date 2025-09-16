@@ -0,0 +1,36 @@
// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/utils/routing", () => ({
  getServerCountry: vi.fn(),
}))

import { middleware } from "@/middleware"
import { getServerCountry } from "@/lib/utils/routing"

describe("legacy post redirect", () => {
  it("uses country from server cookies", () => {
    vi.mocked(getServerCountry).mockReturnValue("za")

    const req = new NextRequest("https://example.com/post/some-slug")
    const res = middleware(req)

    expect(res?.status).toBe(307)
    expect(res?.headers.get("location")).toBe(
      "https://example.com/za/article/some-slug",
    )
  })

  it("falls back to default country", () => {
    vi.mocked(getServerCountry).mockReturnValue("sz")

    const req = new NextRequest("https://example.com/post/another")
    const res = middleware(req)

    expect(res?.headers.get("location")).toBe(
      "https://example.com/sz/article/another",
    )
  })
})
