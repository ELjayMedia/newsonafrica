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

describe("preferences actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    sessionRef.current = { user: { id: "user-1" } }
  })

  it("revalidates user cache after updating preferences", async () => {
    const userSettingsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "user-1" }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }

    const userPreferencesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: "user-1", sections: ["news"], blocked_topics: [], countries: [] },
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }

    const profilesUpdateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { interests: ["news"], preferences: {} },
        error: null,
      }),
      update: vi.fn().mockReturnValue(profilesUpdateChain),
    }

    supabaseRef.current = {
      from: vi.fn((table: string) => {
        switch (table) {
          case "user_settings":
            return userSettingsQuery
          case "user_preferences":
            return userPreferencesQuery
          case "profiles":
            return profilesQuery
          default:
            throw new Error(`Unexpected table: ${table}`)
        }
      }),
    }

    const { updatePreferences } = await import("./preferences")

    const result = await updatePreferences({
      settings: { theme: "dark" as any },
      content: { sections: ["news"] },
    })

    expect(result.error).toBeNull()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.USERS)
  })

  it("revalidates user cache after updating profile preferences", async () => {
    const profilesUpdateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { interests: [], preferences: {} },
        error: null,
      }),
      update: vi.fn().mockReturnValue(profilesUpdateChain),
    }

    const userSettingsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "user-1" }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }

    const userPreferencesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: "user-1", sections: [], blocked_topics: [], countries: [] },
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }

    supabaseRef.current = {
      from: vi.fn((table: string) => {
        switch (table) {
          case "profiles":
            return profilesQuery
          case "user_settings":
            return userSettingsQuery
          case "user_preferences":
            return userPreferencesQuery
          default:
            throw new Error(`Unexpected table: ${table}`)
        }
      }),
    }

    const { updateProfilePreferences } = await import("./preferences")

    const result = await updateProfilePreferences({ comment_sort: "newest" as any })

    expect(result.error).toBeNull()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.USERS)
  })
})
