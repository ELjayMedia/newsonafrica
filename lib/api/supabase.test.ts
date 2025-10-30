import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("createStubSupabaseClient", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    vi.resetModules()
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

    vi.resetModules()
  })

  it("provides noop implementations for rpc and channel when env vars are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { getSupabaseClient } = await import("./supabase")
    const client = getSupabaseClient()

    await expect(client.rpc("test" as any)).resolves.toMatchObject({
      data: null,
      error: expect.any(Error),
    })

    const channel = client
      .channel("test-channel")
      .on("event", {}, () => {})
      .subscribe()

    await expect(channel.unsubscribe()).resolves.toBe("ok")
    await expect(client.removeChannel(channel as any)).resolves.toBe("ok")

    warnSpy.mockRestore()
  })
})
