import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createBrowserClientMock = vi.fn()

vi.mock("../browser-client", () => ({
  createClient: createBrowserClientMock,
}))

describe("client-runtime", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(async () => {
    vi.resetModules()
    createBrowserClientMock.mockReset()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    }

    if (originalAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey
    }
  })

  it("reports missing environment configuration", async () => {
    const { isSupabaseConfigured } = await import("./client-runtime")
    expect(isSupabaseConfigured()).toBe(false)
  })

  it("creates a lazy singleton client", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    const fakeClient = { auth: {} }
    createBrowserClientMock.mockReturnValue(fakeClient)

    const { getSupabaseBrowserClient, resetSupabaseBrowserClientForTests } = await import("./client-runtime")

    const first = getSupabaseBrowserClient()
    const second = getSupabaseBrowserClient()

    expect(first).toBe(fakeClient)
    expect(second).toBe(fakeClient)
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1)

    resetSupabaseBrowserClientForTests()
  })
})
