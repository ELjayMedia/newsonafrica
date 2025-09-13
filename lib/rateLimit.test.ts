import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { applyRateLimit } from "./api-utils"

describe("applyRateLimit", () => {
  it("allows requests under the limit", async () => {
    const req = new NextRequest("http://example.com")
    const res1 = await applyRateLimit(req, 2, "TEST_SUCCESS")
    const res2 = await applyRateLimit(req, 2, "TEST_SUCCESS")
    expect(res1).toBeNull()
    expect(res2).toBeNull()
  })

  it("throttles requests over the limit", async () => {
    const req = new NextRequest("http://example.com")
    await applyRateLimit(req, 2, "TEST_THROTTLE")
    await applyRateLimit(req, 2, "TEST_THROTTLE")
    const res = await applyRateLimit(req, 2, "TEST_THROTTLE")
    expect(res?.status).toBe(429)

  })
})
