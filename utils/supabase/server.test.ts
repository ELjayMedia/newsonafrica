import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createSupabaseServerClientMock = vi.fn()
const cookiesMock = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: createSupabaseServerClientMock,
}))

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ORIGINAL_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

describe("supabase server utilities", () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset()
    cookiesMock.mockReset()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    if (typeof ORIGINAL_SUPABASE_URL === "string") {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    }

    if (typeof ORIGINAL_SUPABASE_ANON_KEY === "string") {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_SUPABASE_ANON_KEY
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  })

  it("returns null when configuration is missing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { getSupabaseConfig, createServerClient } = await import("./server")

    expect(getSupabaseConfig()).toBeNull()
    expect(createServerClient()).toBeNull()
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("creates a Supabase client when configuration is present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    const cookieStoreMock = {
      get: vi.fn(),
      set: vi.fn(),
    }

    cookiesMock.mockReturnValue(cookieStoreMock)

    const supabaseClient = { auth: {} }
    createSupabaseServerClientMock.mockReturnValue(supabaseClient)

    const { createServerClient } = await import("./server")

    const client = createServerClient()

    expect(client).toBe(supabaseClient)
    expect(createSupabaseServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
    expect(cookiesMock).toHaveBeenCalledTimes(1)
  })
})
