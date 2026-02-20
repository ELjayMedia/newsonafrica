import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

describe("getGraphQLEndpoint", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it("accepts country-subpath GraphQL URLs", async () => {
    process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = "https://newsonafrica.com/za/graphql"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("za")).toBe("https://newsonafrica.com/za/graphql")
  })

  it("accepts dedicated-domain GraphQL URLs", async () => {
    process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = "https://za.example.com/graphql"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("za")).toBe("https://za.example.com/graphql")
  })

  it("falls back to the default endpoint when the override is not a GraphQL URL", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/sz/wp-json"

    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://newsonafrica.com/sz/graphql")
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring WP GraphQL override",
      expect.objectContaining({
        country: "sz",
        graphqlOverride: "https://example.com/sz/wp-json",
        effectiveGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
        reason: 'expected pathname to end with "/graphql" or match an allowlisted pattern',
      }),
    )
  })

  it("accepts overrides that include trailing slashes", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/sz/graphql/"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://example.com/sz/graphql")
  })
})

describe("getWpEndpoints", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses the default GraphQL endpoint when the override would have caused 404s", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/graphql-v1"

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("sz").graphql).toBe("https://newsonafrica.com/sz/graphql")
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring WP GraphQL override",
      expect.objectContaining({
        country: "sz",
        graphqlOverride: "https://example.com/graphql-v1",
        effectiveGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
        reason: 'expected pathname to end with "/graphql" or match an allowlisted pattern',
      }),
    )
  })
})
