// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/utils/routing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/routing")>()
  return {
    ...actual,
    getServerCountry: vi.fn(),
  }
})

let middleware: typeof import("@/middleware")["middleware"]
let getServerCountry: typeof import("@/lib/utils/routing")["getServerCountry"]

beforeAll(async () => {
  ;({ middleware } = await import("@/middleware"))
  ;({ getServerCountry } = await import("@/lib/utils/routing"))
})

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

afterAll(() => {
  vi.resetModules()
})
