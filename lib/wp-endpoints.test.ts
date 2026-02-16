import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

describe("getGraphQLEndpoint", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
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

  it("returns a custom override when it includes the expected country segment", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/custom/sz/graphql"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://example.com/custom/sz/graphql")
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
        defaultGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
        reason: "does not look like a GraphQL endpoint",
      }),
    )
  })

  it("falls back to the default endpoint when the override is missing the country slug", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/graphql"

    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://newsonafrica.com/sz/graphql")
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring WP GraphQL override",
      expect.objectContaining({
        country: "sz",
        graphqlOverride: "https://example.com/graphql",
        defaultGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
        reason: 'expected pathname to include "/sz/graphql"',
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
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://example.com/graphql"

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("sz").graphql).toBe("https://newsonafrica.com/sz/graphql")
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring WP GraphQL override",
      expect.objectContaining({
        country: "sz",
        graphqlOverride: "https://example.com/graphql",
        defaultGraphQLEndpoint: "https://newsonafrica.com/sz/graphql",
        reason: 'expected pathname to include "/sz/graphql"',
      }),
    )
  })
})
