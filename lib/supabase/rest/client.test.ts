import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = process.env
const SUPABASE_URL_WITHOUT_TRAILING_SLASH =
  "https://anhjovxdgwepobsgudya.supabase.co"
const SUPABASE_URL_WITH_TRAILING_SLASH =
  "https://anhjovxdgwepobsgudya.supabase.co/"

describe("supabase rest client URL normalization", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it("builds REST_BASE_URL from the normalized URL when env has no trailing slash", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL_WITHOUT_TRAILING_SLASH

    const { REST_BASE_URL } = await import("./client")

    expect(REST_BASE_URL).toBe(
      "https://anhjovxdgwepobsgudya.supabase.co/rest/v1",
    )
  })

  it("builds REST_BASE_URL from the normalized URL when env has a trailing slash", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL_WITH_TRAILING_SLASH

    const { REST_BASE_URL } = await import("./client")

    expect(REST_BASE_URL).toBe(
      "https://anhjovxdgwepobsgudya.supabase.co/rest/v1",
    )
  })

  it("buildRestUrl emits identical final URLs for both env input forms", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL_WITHOUT_TRAILING_SLASH
    const { buildRestUrl: buildWithoutTrailingSlash } = await import("./client")
    const urlWithoutTrailingSlash = buildWithoutTrailingSlash("comments")

    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL_WITH_TRAILING_SLASH
    const { buildRestUrl: buildWithTrailingSlash } = await import("./client")
    const urlWithTrailingSlash = buildWithTrailingSlash("comments")

    expect(urlWithoutTrailingSlash).toBe(
      "https://anhjovxdgwepobsgudya.supabase.co/rest/v1/comments",
    )
    expect(urlWithTrailingSlash).toBe(urlWithoutTrailingSlash)
  })
})
