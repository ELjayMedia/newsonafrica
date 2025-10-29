import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createMockResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ data: {} }),
  })

const MODULES_TO_UNMOCK = ["../utils/fetchWithRetry", "@/lib/wp-endpoints"]
const ORIGINAL_WINDOW = globalThis.window

describe("fetchWordPressGraphQL headers", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    for (const moduleId of MODULES_TO_UNMOCK) {
      vi.doUnmock(moduleId)
    }

    if (ORIGINAL_WINDOW === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window
    } else {
      globalThis.window = ORIGINAL_WINDOW
    }

    vi.resetModules()
    vi.clearAllMocks()
  })

  it("attaches hardened headers for server-side requests", async () => {
    const fetchWithRetry = vi.fn().mockImplementation(() => createMockResponse())

    vi.doMock("../utils/fetchWithRetry", () => ({
      fetchWithRetry,
    }))

    vi.doMock("@/lib/wp-endpoints", async () => {
      const actual = await vi.importActual<typeof import("@/lib/wp-endpoints")>(
        "@/lib/wp-endpoints",
      )

      return {
        ...actual,
        getGraphQLEndpoint: () => "https://example.com/graphql",
      }
    })

    // Simulate server environment for the module import.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = undefined

    const { fetchWordPressGraphQL } = await import("./client")

    await fetchWordPressGraphQL("sz", "query")

    expect(fetchWithRetry).toHaveBeenCalledWith(
      "https://example.com/graphql",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: expect.any(String),
          Referer: expect.any(String),
          "User-Agent": expect.stringContaining("NewsOnAfrica/1.0"),
        }),
      }),
    )

    const [, options] = fetchWithRetry.mock.calls[0]!
    const headers = options?.headers as Record<string, string>
    expect(headers.Origin).toBe(headers.Referer)
  })
})
