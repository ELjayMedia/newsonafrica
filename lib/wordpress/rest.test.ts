import { afterEach, describe, expect, it, vi } from "vitest"

describe("fetchWordPressRest", () => {
  const originalWindow = (globalThis as { window?: unknown }).window

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.doUnmock("../utils/fetchWithRetry")
    vi.unstubAllEnvs()

    if (typeof originalWindow === "undefined") {
      delete (globalThis as { window?: unknown }).window
    } else {
      ;(globalThis as { window?: unknown }).window = originalWindow
    }
  })

  it("forwards WP auth headers during server-side REST fetches", async () => {
    vi.stubEnv(
      "WORDPRESS_GRAPHQL_AUTH_HEADER",
      JSON.stringify({ Authorization: "Bearer secret", "X-Role": "editor" }),
    )

    const fetchWithRetryMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response)

    vi.doMock("../utils/fetchWithRetry", () => ({
      fetchWithRetry: fetchWithRetryMock,
    }))

    ;(globalThis as { window?: unknown }).window = undefined

    vi.resetModules()
    const { fetchWordPressRest } = await import("./rest")

    await fetchWordPressRest("sz", "/posts")

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchWithRetryMock.mock.calls[0]
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "X-Role": "editor",
    })
  })
})
