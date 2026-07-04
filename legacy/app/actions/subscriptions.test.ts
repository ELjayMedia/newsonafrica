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

describe("subscription actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    sessionRef.current = { user: { id: "user-1" } }
  })

  it("revalidates subscription cache after recording a subscription", async () => {
    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "payment-1",
          user_id: "user-1",
          plan: "premium",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    }

    supabaseRef.current = {
      from: vi.fn(() => upsertChain),
    }

    const { recordSubscription } = await import("./subscriptions")

    const result = await recordSubscription({
      userId: "user-1",
      plan: "premium",
      status: "active" as any,
      renewalDate: null,
      paymentId: "payment-1",
    })

    expect(result.error).toBeNull()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.SUBSCRIPTIONS)
  })
})
