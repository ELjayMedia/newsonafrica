import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const ORIGINAL_ENV = { ...process.env }

describe("getGraphQLEndpoint", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_NG_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_SZ_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_ZA_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_NG_REST_BASE
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

  it("uses registry defaults when no override is provided", async () => {
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("sz")).toBe("https://newsonafrica.com/sz/graphql")
  })

  it("uses registry GraphQL overrides", async () => {
    process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = "https://za.example.com/graphql/"
    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("za")).toBe("https://za.example.com/graphql")
  })

  it("falls back safely when an edition GraphQL env override is malformed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = "not a valid url"

    const { getGraphQLEndpoint } = await import("./wp-endpoints")

    expect(getGraphQLEndpoint("za")).toBe("https://newsonafrica.com/za/graphql")
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[wp-editions-registry] Invalid endpoint env override"),
      expect.objectContaining({
        envKey: "NEXT_PUBLIC_WP_ZA_GRAPHQL",
        fallback: "https://newsonafrica.com/za/graphql",
      }),
    )
  })
})

describe("getWpEndpoints", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_NG_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_SZ_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_ZA_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_NG_REST_BASE
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses the explicit registry for supported editions", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://edition.example.com/sz/graphql"
    process.env.NEXT_PUBLIC_WP_SZ_REST_BASE = "https://edition.example.com/sz/wp-json/wp/v2/"

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("sz")).toEqual({
      graphql: "https://edition.example.com/sz/graphql",
      rest: "https://edition.example.com/sz/wp-json/wp/v2",
    })
  })

  it("validates each edition endpoint independently and only falls back for malformed values", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_NG_GRAPHQL = "not a valid url"
    process.env.NEXT_PUBLIC_WP_NG_REST_BASE = "https://ng.example.com/wp-json/wp/v2"

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("ng")).toEqual({
      graphql: "https://newsonafrica.com/ng/graphql",
      rest: "https://ng.example.com/wp-json/wp/v2",
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[wp-editions-registry] Invalid endpoint env override"),
      expect.objectContaining({
        envKey: "NEXT_PUBLIC_WP_NG_GRAPHQL",
        fallback: "https://newsonafrica.com/ng/graphql",
      }),
    )
  })

  it("keeps dynamic fallback for unknown editions with a deprecation warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.NEXT_PUBLIC_WP_KE_GRAPHQL = "https://ke.example.com/graphql"
    process.env.NEXT_PUBLIC_WP_KE_REST_BASE = "https://ke.example.com/wp-json/wp/v2"

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("ke")).toEqual({
      graphql: "https://ke.example.com/graphql",
      rest: "https://ke.example.com/wp-json/wp/v2",
    })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DEPRECATION]"),
      expect.objectContaining({
        country: "ke",
      }),
    )
  })
})


describe("registry entry validation safety", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_NG_GRAPHQL
    delete process.env.NEXT_PUBLIC_WP_SZ_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_ZA_REST_BASE
    delete process.env.NEXT_PUBLIC_WP_NG_REST_BASE
    process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("returns default endpoints when registry contains malformed urls", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.doMock("@/lib/wordpress/editions-registry", () => ({
      EDITION_CODES: ["sz", "za", "ng"],
      isEditionCode: (country: string) => ["sz", "za", "ng"].includes(country),
      WORDPRESS_EDITIONS_REGISTRY: {
        sz: {
          graphql: "not a valid url",
          rest: "still not a url",
        },
        za: {
          graphql: "https://newsonafrica.com/za/graphql",
          rest: "https://newsonafrica.com/za/wp-json/wp/v2",
        },
        ng: {
          graphql: "https://newsonafrica.com/ng/graphql",
          rest: "https://newsonafrica.com/ng/wp-json/wp/v2",
        },
      },
    }))

    const { getWpEndpoints } = await import("./wp-endpoints")

    expect(getWpEndpoints("sz")).toEqual({
      graphql: "https://newsonafrica.com/sz/graphql",
      rest: "https://newsonafrica.com/sz/wp-json/wp/v2",
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[wp-endpoints] Invalid registry graphql endpoint; using default"),
      expect.objectContaining({
        country: "sz",
        fallback: "https://newsonafrica.com/sz/graphql",
      }),
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[wp-endpoints] Invalid registry rest endpoint; using default"),
      expect.objectContaining({
        country: "sz",
        fallback: "https://newsonafrica.com/sz/wp-json/wp/v2",
      }),
    )
  })
})
