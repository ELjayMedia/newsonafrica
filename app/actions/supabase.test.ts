import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.fn()

const SUPABASE_UNAVAILABLE_ERROR = "Supabase unavailable"

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: createServerClientMock,
  SUPABASE_UNAVAILABLE_ERROR,
}))

describe("supabase server actions", () => {
  beforeEach(() => {
    vi.resetModules()
    createServerClientMock.mockReset()
  })

  it("returns session data through withSupabaseSession", async () => {
    const session = { user: { id: "user-123" } }
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      },
    }

    createServerClientMock.mockReturnValueOnce(supabase as any)

    const { withSupabaseSession } = await import("./supabase")

    const result = await withSupabaseSession(async ({ supabase: client, session: resolved }) => {
      expect(client).toBe(supabase)
      expect(resolved).toEqual(session)
      return { ok: true }
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ ok: true })
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
  })

  it("short-circuits withSupabaseSession when Supabase is unavailable", async () => {
    createServerClientMock.mockReturnValueOnce(null)

    const { withSupabaseSession } = await import("./supabase")

    const callback = vi.fn()
    const result = await withSupabaseSession(callback)

    expect(callback).not.toHaveBeenCalled()
    expect(result.data).toBeNull()
    expect(result.error?.message).toBe(SUPABASE_UNAVAILABLE_ERROR)
  })

  it("propagates errors from getSession in withSupabaseSession", async () => {
    const authError = new Error("session failure")
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: authError }),
      },
    }

    createServerClientMock.mockReturnValueOnce(supabase as any)

    const { withSupabaseSession } = await import("./supabase")

    const result = await withSupabaseSession(async () => ({ ok: false }))

    expect(result.data).toBeNull()
    expect(result.error?.message).toBe("session failure")
  })

  it("returns session data via getSupabaseSession", async () => {
    const session = { user: { id: "user-456" } }
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      },
    }

    createServerClientMock.mockReturnValueOnce(supabase as any)

    const { getSupabaseSession } = await import("./supabase")

    const result = await getSupabaseSession()

    expect(result.error).toBeNull()
    expect(result.data).toEqual(session)
  })

  it("short-circuits getSupabaseSession when Supabase is unavailable", async () => {
    createServerClientMock.mockReturnValueOnce(null)

    const { getSupabaseSession } = await import("./supabase")

    const result = await getSupabaseSession()

    expect(result.data).toBeNull()
    expect(result.error?.message).toBe(SUPABASE_UNAVAILABLE_ERROR)
  })
})
