import { describe, expect, it, vi } from "vitest"

const clearSessionCookieClientMock = vi.fn()

vi.mock("@/lib/auth/session-cookie-client", () => ({
  clearSessionCookieClient: clearSessionCookieClientMock,
}))

describe("auth module", () => {
  it("rejects sign-in when email or password is missing", async () => {
    const { signInWithEmail } = await import("./auth")

    const response = await signInWithEmail("", "", { client: { auth: {} } as never })

    expect(response.success).toBe(false)
    expect(response.error).toBe("Email and password are required")
  })

  it("clears the session cookie after successful sign-out", async () => {
    const { signOutUser } = await import("./auth")

    const client = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }

    const response = await signOutUser({ client: client as never })

    expect(response.success).toBe(true)
    expect(clearSessionCookieClientMock).toHaveBeenCalledTimes(1)
  })
})
