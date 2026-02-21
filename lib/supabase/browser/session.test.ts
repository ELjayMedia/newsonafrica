import { describe, expect, it, vi } from "vitest"

const persistSessionCookieMock = vi.fn()

vi.mock("@/lib/auth/session-cookie-client", () => ({
  persistSessionCookie: persistSessionCookieMock,
}))

describe("session module", () => {
  it("refreshes sessions that are close to expiry", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const currentSession = { expires_at: nowSeconds + 120 }
    const refreshedSession = { expires_at: nowSeconds + 3600 }

    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: currentSession }, error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: refreshedSession }, error: null }),
      },
    }

    const { checkAndRefreshSession } = await import("./session")
    const result = await checkAndRefreshSession({ client: client as never })

    expect(result).toBe(refreshedSession)
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it("maps profile fields when persisting session cookies", async () => {
    const { persistSessionCookieForProfile } = await import("./session")

    await persistSessionCookieForProfile("user-3", {
      username: "hello",
      avatar_url: "https://example.com/avatar.png",
      role: "member",
    } as never)

    expect(persistSessionCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-3",
        username: "hello",
        avatar_url: "https://example.com/avatar.png",
        role: "member",
      }),
    )
  })
})
