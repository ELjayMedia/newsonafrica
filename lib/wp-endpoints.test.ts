import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

describe("getGraphQLEndpoint", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  afterAll(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, ORIGINAL_ENV)
  })

  it("uses the default endpoint when no override is provided", async () => {
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://newsonafrica.com/sz/graphql")
  })

  it("returns a custom override when it looks like a GraphQL endpoint", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/custom/graphql"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://example.com/custom/graphql")
  })

  it("falls back to the default endpoint when the override is not a GraphQL URL", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/sz/wp-json"

    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://newsonafrica.com/sz/graphql")
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring WP GraphQL override because it does not look like a GraphQL endpoint",
      expect.objectContaining({
        country: "sz",
        graphqlOverride: "https://example.com/sz/wp-json",
        defaultGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
      }),
    )

    warnSpy.mockRestore()
  })
})
