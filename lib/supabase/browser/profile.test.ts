import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./session", () => ({
  persistSessionCookieForProfile: vi.fn().mockResolvedValue(undefined),
}))

function createProfileQuery(profile: { id: string; username: string }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  }
}

describe("profile module", () => {
  beforeEach(async () => {
    const { clearProfileCache } = await import("./profile")
    clearProfileCache()
  })

  it("uses profile cache within the module", async () => {
    const { getUserProfile } = await import("./profile")

    const query = createProfileQuery({ id: "user-1", username: "cached" })
    const client = {
      from: vi.fn().mockReturnValue(query),
    }

    const first = await getUserProfile("user-1", { client: client as never })
    const second = await getUserProfile("user-1", { client: client as never })

    expect(first.username).toBe("cached")
    expect(second.username).toBe("cached")
    expect(query.single).toHaveBeenCalledTimes(1)
  })

  it("supports bypassing cache per request", async () => {
    const { getUserProfile } = await import("./profile")

    const query = createProfileQuery({ id: "user-2", username: "fresh" })
    const client = {
      from: vi.fn().mockReturnValue(query),
    }

    await getUserProfile("user-2", { client: client as never, skipCache: true })
    await getUserProfile("user-2", { client: client as never, skipCache: true })

    expect(query.single).toHaveBeenCalledTimes(2)
  })
})
