import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = process.env

const WORDPRESS_COUNTRY_CODES = ["sz", "za", "ng", "ke", "tz", "eg", "gh"] as const

const resetBaseEnv = () => {
  process.env = { ...ORIGINAL_ENV }
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
  process.env.NEXT_PUBLIC_DEFAULT_SITE = "sz"
  process.env.ANALYTICS_API_BASE_URL = "https://analytics.example.com"

  for (const country of WORDPRESS_COUNTRY_CODES) {
    const uppercase = country.toUpperCase()
    delete process.env[`NEXT_PUBLIC_WP_${uppercase}_GRAPHQL`]
    delete process.env[`NEXT_PUBLIC_WP_${uppercase}_REST_BASE`]
  }
  delete process.env.WORDPRESS_GRAPHQL_AUTH_HEADER
  delete process.env.WORDPRESS_REQUEST_TIMEOUT_MS
}

describe("config/env", () => {
  beforeEach(() => {
    vi.resetModules()
    resetBaseEnv()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it("parses and freezes the environment configuration", async () => {
    process.env.WORDPRESS_REQUEST_TIMEOUT_MS = "45000"

    const { ENV, WP_AUTH_HEADERS } = await import("./env")

    expect(Object.isFrozen(ENV)).toBe(true)
    expect(ENV.NEXT_PUBLIC_SITE_URL).toBe("https://example.com")
    expect(ENV.NEXT_PUBLIC_DEFAULT_SITE).toBe("sz")
    expect(ENV.ANALYTICS_API_BASE_URL).toBe("https://analytics.example.com")
    expect(ENV.WORDPRESS_REQUEST_TIMEOUT_MS).toBe(45000)
    expect(WP_AUTH_HEADERS).toBeUndefined()
  })

  it("parses GraphQL overrides when provided", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://override.example.com/sz/graphql/"

    const { ENV } = await import("./env")

    expect(ENV.NEXT_PUBLIC_WP_SZ_GRAPHQL).toBe(
      "https://override.example.com/sz/graphql/",
    )
  })

  it("parses REST overrides when provided", async () => {
    process.env.NEXT_PUBLIC_WP_ZA_REST_BASE = "https://override.example.com/za/wp-json/wp/v2"

    const { ENV } = await import("./env")

    expect(ENV.NEXT_PUBLIC_WP_ZA_REST_BASE).toBe(
      "https://override.example.com/za/wp-json/wp/v2",
    )
  })

  it("throws when a GraphQL override is missing the country slug", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://override.example.com/graphql"

    await expect(import("./env")).rejects.toThrowError(/\/sz\/graphql/)
  })

  it("parses JSON WordPress auth headers", async () => {
    process.env.WORDPRESS_GRAPHQL_AUTH_HEADER = JSON.stringify({
      Authorization: "Bearer token",
      "X-Custom": " custom-value ",
    })

    const { WP_AUTH_HEADERS } = await import("./env")

    expect(WP_AUTH_HEADERS).toEqual({
      Authorization: "Bearer token",
      "X-Custom": "custom-value",
    })
    expect(WP_AUTH_HEADERS).not.toBeUndefined()
    expect(Object.isFrozen(WP_AUTH_HEADERS!)).toBe(true)
  })

  it("throws when auth header JSON is invalid", async () => {
    process.env.WORDPRESS_GRAPHQL_AUTH_HEADER = "{"

    await expect(import("./env")).rejects.toThrowError(
      /must be valid JSON/i,
    )
  })
})
