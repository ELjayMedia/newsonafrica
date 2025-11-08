import { beforeEach, describe, expect, it, vi } from "vitest"

import { CACHE_TAGS } from "@/lib/cache/constants"

const revalidateByTagMock = vi.fn()

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: revalidateByTagMock,
}))

const supabaseRef: { current: any } = { current: null }
const sessionRef: { current: any } = { current: { user: { id: "user-1", app_metadata: {} } } }

vi.mock("@/app/actions/supabase", () => ({
  withSupabaseSession: async (callback: any) => {
    if (!supabaseRef.current) {
      throw new Error("Supabase mock not configured")
    }

    const data = await callback({
      supabase: supabaseRef.current,
      session: sessionRef.current,
    })

    return { data, error: null }
  },
}))

const updateUserByIdMock = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: updateUserByIdMock,
      },
    },
  }),
}))

describe("auth actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    sessionRef.current = { user: { id: "user-1", app_metadata: {} } }
    updateUserByIdMock.mockResolvedValue({ error: null })
  })

  it("revalidates user cache after updating auth country", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test"

    const refreshSessionMock = vi.fn().mockResolvedValue({})

    supabaseRef.current = {
      auth: {
        refreshSession: refreshSessionMock,
      },
    }

    const { updateAuthCountry } = await import("./index")

    const result = await updateAuthCountry("ng")

    expect(result.error).toBeNull()
    expect(updateUserByIdMock).toHaveBeenCalled()
    expect(refreshSessionMock).toHaveBeenCalled()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.USERS)
  })

  it("revalidates user cache after updating profile", async () => {
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "user-1", username: "new" }, error: null }),
    }

    supabaseRef.current = {
      from: vi.fn(() => updateChain),
    }

    const { updateProfile } = await import("./index")

    const result = await updateProfile({ username: "new" })

    expect(result.error).toBeNull()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.USERS)
  })
})
