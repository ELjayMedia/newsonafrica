import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createQueryBuilder = (response: { data: any; error: any }) => {
  const builder: any = {
    select: () => builder,
    limit: () => builder,
  }

  const promise = Promise.resolve(response)
  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  return builder
}

describe("columnExists fallback behaviour", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unmock("@/utils/supabase-client")
  })

  it("returns false when RPC is unavailable and the fallback errors", async () => {
    const stubClient = {
      from: vi.fn(() => createQueryBuilder({ data: null, error: new Error("stub error") })),
    }

    vi.doMock("@/utils/supabase-client", () => ({
      createClient: vi.fn(() => stubClient),
    }))

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { columnExists } = await import("@/utils/supabase-query-utils")

    const result = await columnExists("comments", "status")

    expect(result).toBe(false)
    expect(stubClient.from).toHaveBeenCalledWith("comments")
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("returns true when the fallback select succeeds", async () => {
    const stubClient = {
      from: vi.fn(() => createQueryBuilder({ data: [{}], error: null })),
    }

    vi.doMock("@/utils/supabase-client", () => ({
      createClient: vi.fn(() => stubClient),
    }))

    const { columnExists } = await import("@/utils/supabase-query-utils")

    const result = await columnExists("comments", "status")

    expect(result).toBe(true)
    expect(stubClient.from).toHaveBeenCalledWith("comments")
  })
})
