import { Buffer } from "node:buffer"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

describe("wp client", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    process.env.NEXT_PUBLIC_WP_SZ_REST_BASE = "https://newsonafrica.com/sz/wp-json/wp/v2"
    process.env.NEXT_PUBLIC_WP_ZA_REST_BASE = "https://newsonafrica.com/za/wp-json/wp/v2/"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    const currentKeys = new Set(Object.keys(process.env))
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
      currentKeys.delete(key)
    })
    currentKeys.forEach((key) => {
      delete process.env[key]
    })
  })

  it("calls the country-specific REST endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal("fetch", fetchMock)

    const { getLatestPosts } = await import("./wp")

    await getLatestPosts("sz")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestUrl).toBe(
      "https://newsonafrica.com/sz/wp-json/wp/v2/posts?per_page=12&_embed=1&order=desc&orderby=date"
    )
    expect(requestInit?.next).toEqual({ revalidate: 60, tags: ["country:sz"] })
  })

  it("normalizes trailing and leading slashes when building URLs", async () => {
    process.env.NEXT_PUBLIC_WP_SZ_REST_BASE = " https://newsonafrica.com/sz/wp-json/wp/v2" // missing trailing slash + padded
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal("fetch", fetchMock)

    const { getCategories } = await import("./wp")

    await getCategories("sz")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl] = fetchMock.mock.calls[0] as [string]
    expect(requestUrl).toBe(
      "https://newsonafrica.com/sz/wp-json/wp/v2/categories?per_page=20&hide_empty=false"
    )
  })



  it("adds the Authorization header when credentials are provided", async () => {
    process.env.WP_APP_USER = "app"
    process.env.WP_APP_PASS = "secret"
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal("fetch", fetchMock)

    const { getLatestPosts } = await import("./wp")

    await getLatestPosts("sz")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestInit?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("app:secret", "utf8").toString("base64")}`,
    })
  })
})
