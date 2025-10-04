import { afterEach, describe, expect, it, vi } from "vitest"

import { getRestBase } from "./wp-endpoints"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe("getRestBase", () => {
  it("falls back to the per-country default when the override looks like GraphQL", () => {
    process.env.NEXT_PUBLIC_WP_NG_REST_BASE = "https://example.com/graphql"
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const restBase = getRestBase("ng")

    expect(restBase).toBe("https://newsonafrica.com/ng/wp-json/wp/v2")
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Ignoring WP REST override"),
      expect.objectContaining({
        country: "ng",
        restOverride: "https://example.com/graphql",
        defaultRestBase: "https://newsonafrica.com/ng/wp-json/wp/v2",
      }),
    )
  })

  it("returns the fallback REST base when it does not resemble a GraphQL endpoint", () => {
    process.env.NEXT_PUBLIC_WP_NG_REST_BASE = "https://example.com/wp-json/wp/v2/"
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const restBase = getRestBase("ng")

    expect(restBase).toBe("https://example.com/wp-json/wp/v2")
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
