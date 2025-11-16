import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  resolveEdition: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/config/env", () => ({
  ENV: {
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    NEXT_PUBLIC_DEFAULT_SITE: "sz",
    NEXT_PUBLIC_WP_SZ_GRAPHQL: undefined,
    NEXT_PUBLIC_WP_ZA_GRAPHQL: undefined,
    ANALYTICS_API_BASE_URL: "https://example.com/api/analytics",
    WORDPRESS_REQUEST_TIMEOUT_MS: 30_000,
  },
}))

vi.mock("./article/[slug]/article-data", () => ({
  resolveEdition: (...args: unknown[]) => mocks.resolveEdition(...args),
}))

describe("CountryPage metadata", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.resolveEdition.mockReset()
  })

  it("builds country-specific metadata when the edition exists", async () => {
    mocks.resolveEdition.mockReturnValue({
      type: "country",
      code: "ng",
      name: "Nigeria",
      flag: "🇳🇬",
      canonicalUrl: "https://example.com/ng",
      hreflang: "en-NG",
      apiEndpoint: "https://example.com/wp/ng/graphql",
    })

    const { generateMetadata } = await import("./page")

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: "ng" }) })

    expect(mocks.resolveEdition).toHaveBeenCalledWith("ng")
    expect(metadata.title).toContain("Nigeria")
    expect(metadata.description).toContain("Nigeria")
    expect(metadata.alternates?.canonical).toBe("https://example.com/ng")
    expect(metadata.alternates?.languages).toEqual({ "en-NG": "https://example.com/ng" })
    expect(metadata.openGraph?.url).toBe("https://example.com/ng")
    expect(metadata.openGraph?.locale).toBe("en_NG")
    expect(metadata.twitter?.title).toContain("Nigeria")
  })

  it("returns a noindex metadata response when the edition is missing", async () => {
    mocks.resolveEdition.mockReturnValue(null)

    const { generateMetadata } = await import("./page")

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: "xx" }) })

    expect(metadata.title).toBe("Edition Not Found - News On Africa")
    expect(metadata.robots?.index).toBe(false)
    expect(metadata.robots?.follow).toBe(false)
    expect(metadata.alternates?.canonical).toBe("https://example.com/xx")
  })
})
