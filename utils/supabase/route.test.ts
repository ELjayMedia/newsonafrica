import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const createRouteHandlerClientMock = vi.fn()
const getSupabaseConfigMock = vi.fn()

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createRouteHandlerClient: createRouteHandlerClientMock,
}))

vi.mock("./server", () => ({
  SUPABASE_UNAVAILABLE_ERROR: "Supabase unavailable",
  getSupabaseConfig: getSupabaseConfigMock,
}))

describe("createSupabaseRouteClient", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined

  beforeEach(() => {
    createRouteHandlerClientMock.mockReset()
    getSupabaseConfigMock.mockReset()
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  it("returns null when Supabase configuration is missing", async () => {
    getSupabaseConfigMock.mockReturnValue(null)

    const { createSupabaseRouteClient } = await import("./route")
    const request = new NextRequest("https://example.com")

    const result = createSupabaseRouteClient(request)

    expect(result).toBeNull()
    expect(createRouteHandlerClientMock).not.toHaveBeenCalled()
  })

  it("creates a route client when configuration is available", async () => {
    getSupabaseConfigMock.mockReturnValue({
      supabaseUrl: "https://example.supabase.co",
      supabaseKey: "anon-key",
    })

    const supabaseClient = { auth: {} }
    createRouteHandlerClientMock.mockReturnValue(supabaseClient)

    const { createSupabaseRouteClient } = await import("./route")
    const request = new NextRequest("https://example.com")

    const result = createSupabaseRouteClient(request)

    expect(result?.supabase).toBe(supabaseClient)
    expect(typeof result?.applyCookies).toBe("function")
    expect(createRouteHandlerClientMock).toHaveBeenCalledWith(
      { cookies: expect.any(Function) },
      {
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon-key",
      },
    )
  })
})
