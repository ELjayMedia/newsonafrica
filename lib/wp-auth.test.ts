import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock(
  "node:crypto",
  () => {
    const createHmac = vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue(""),
    }))

    return {
      createHmac,
      default: { createHmac },
    }
  },
  { virtual: true },
)

vi.mock("@/lib/wp-endpoints", () => ({
  getRestBase: vi.fn(),
}))

import { authenticateWPUser } from "./wp-auth"
import { getRestBase } from "@/lib/wp-endpoints"

const getRestBaseMock = vi.mocked(getRestBase)

describe("authenticateWPUser", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("requests the JWT token endpoint at the normalized REST base", async () => {
    const json = vi.fn().mockResolvedValue({ token: "abc123" })
    fetchMock.mockResolvedValue({ ok: true, json } as any)
    getRestBaseMock.mockReturnValue("https://example.com/wp-json/wp/v2")

    await authenticateWPUser("user", "pass")

    const expectedUrl = new URL("/wp-json/jwt-auth/v1/token", "https://example.com")
    expect(fetchMock).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "user", password: "pass" }),
      }),
    )
    expect(json).toHaveBeenCalled()
  })

  it("handles REST bases with trailing slashes", async () => {
    const json = vi.fn().mockResolvedValue({ token: "xyz" })
    fetchMock.mockResolvedValue({ ok: true, json } as any)
    getRestBaseMock.mockReturnValue("https://example.com/wp-json/wp/v2/")

    await authenticateWPUser("user", "pass")

    const expectedUrl = new URL("/wp-json/jwt-auth/v1/token", "https://example.com")
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
  })
})
