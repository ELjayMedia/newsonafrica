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

describe("profile actions cache invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    supabaseRef.current = null
    sessionRef.current = { user: { id: "user-1" } }
  })

  it("revalidates user cache after uploading an avatar", async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/avatar.png" } })

    supabaseRef.current = {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    }

    const { uploadProfileAvatar } = await import("./profile")

    const file = new File(["avatar"], "avatar.png", { type: "image/png" })
    const formData = new FormData()
    formData.append("file", file)

    const result = await uploadProfileAvatar(formData)

    expect(result.error).toBeNull()
    expect(uploadMock).toHaveBeenCalled()
    expect(getPublicUrlMock).toHaveBeenCalled()
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(CACHE_TAGS.USERS)
  })
})
