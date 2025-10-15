import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.hoisted(() => vi.fn())

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}))

describe("createSupabaseRouteClient", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    createServerClientMock.mockReset()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("returns fallback client without throwing when Supabase env vars are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => void 0)

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { createSupabaseRouteClient } = await import("./route-client")

    expect(() => createSupabaseRouteClient()).not.toThrow()

    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(
      warnSpy.mock.calls.some(([message]) =>
        message?.includes("Supabase environment variables are not configured."),
      ),
    ).toBe(true)
  })
})
