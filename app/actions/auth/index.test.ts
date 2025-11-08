import { beforeEach, describe, expect, it, vi } from "vitest"

import { CACHE_TAGS } from "@/lib/cache/constants"

const revalidateByTagMock = vi.fn()

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: revalidateByTagMock,
}))

const supabaseRef: { current: any } = { current: null }
const sessionRef: { current: any } = { current: { user: { id: "user-1" } } }

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

describe("auth actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    sessionRef.current = { user: { id: "user-1" } }
  })

  it("revalidates user cache after updating auth country", async () => {
    const selectMaybeSingleMock = vi.fn(async () => ({ data: { country: null }, error: null }))
    const selectEqMock = vi.fn(() => ({ maybeSingle: selectMaybeSingleMock }))
    const selectMock = vi.fn(() => ({ eq: selectEqMock }))

    const updateEqMock = vi.fn(async () => ({ error: null }))
    const updateMock = vi.fn(() => ({ eq: updateEqMock }))

    supabaseRef.current = {
      from: vi.fn(() => ({
        select: selectMock,
        update: updateMock,
      })),
    }

    const { updateAuthCountry } = await import("./index")

    const result = await updateAuthCountry("ng")

    expect(result.error).toBeNull()
    expect(selectMock).toHaveBeenCalledWith("country")
    expect(updateMock).toHaveBeenCalledWith({
      country: "ng",
      updated_at: expect.any(String),
    })
    expect(updateEqMock).toHaveBeenCalledWith("id", "user-1")
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
