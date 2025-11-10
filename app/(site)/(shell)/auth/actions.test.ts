import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth/session-cookie", () => ({
  writeSessionCookie: vi.fn(),
}))

describe("signInWithPasswordAction", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it("returns an error state when Supabase configuration is missing", async () => {
    const { signInWithPasswordAction, initialAuthFormState } = await import("./actions")

    const formData = new FormData()
    formData.set("email", "user@example.com")
    formData.set("password", "super-secret")

    const result = await signInWithPasswordAction(initialAuthFormState, formData)

    expect(result.status).toBe("error")
    expect(result.message).toBe("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
  })
})
