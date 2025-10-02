import { afterEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe("WordPress endpoint resolution", () => {
  it("throws a helpful error when GraphQL endpoint is missing", async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: originalEnv.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
    }
    delete process.env.NEXT_PUBLIC_WORDPRESS_API_URL
    delete process.env.NEXT_PUBLIC_WORDPRESS_API_URL_SZ

    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    vi.resetModules()

    const promise = (async () => {
      const { fetchFromWpGraphQL } = await import("@/lib/wordpress-api")
      await fetchFromWpGraphQL("sz", "{ posts { nodes { id } } }")
    })()

    await expect(promise).rejects.toThrow(
      /Set NEXT_PUBLIC_WORDPRESS_API_URL_SZ or NEXT_PUBLIC_WORDPRESS_API_URL/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("prefers site-specific overrides when available", async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: originalEnv.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
      NEXT_PUBLIC_WORDPRESS_API_URL: "https://global.example.com/graphql",
      NEXT_PUBLIC_WORDPRESS_API_URL_SZ: "https://sz.example.com/graphql",
      WORDPRESS_REST_API_URL: "https://global.example.com/wp-json/wp/v2",
      WORDPRESS_REST_API_URL_SZ: "https://sz.example.com/wp-json/wp/v2",
    }

    vi.resetModules()

    const { getWpEndpoints } = await import("@/config/wp")

    const szEndpoints = getWpEndpoints("sz")
    expect(szEndpoints.graphql).toBe("https://sz.example.com/graphql")
    expect(szEndpoints.rest).toBe("https://sz.example.com/wp-json/wp/v2")

    const zaEndpoints = getWpEndpoints("za")
    expect(zaEndpoints.graphql).toBe("https://global.example.com/graphql")
    expect(zaEndpoints.rest).toBe("https://global.example.com/wp-json/wp/v2")
  })
})
