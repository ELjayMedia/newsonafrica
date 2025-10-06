import { afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("wpGet", () => {
  function setupFetchMock() {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any)
    return fetchMock
  }

  it("preserves the country-specific REST base when fetching ZA posts", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_WP_ZA_REST_BASE: "https://newsonafrica.com/za/wp-json/wp/v2",
    }

    vi.resetModules()
    const fetchMock = setupFetchMock()
    const { getLatestPosts } = await import("./wp")

    await getLatestPosts("za", 5)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://newsonafrica.com/za/wp-json/wp/v2/posts?per_page=5&_embed=1&order=desc&orderby=date",
      expect.any(Object),
    )
  })

  it("trims extra slashes from the REST base before appending resources", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_WP_SZ_REST_BASE: "https://newsonafrica.com/sz/wp-json/wp/v2///",
    }

    vi.resetModules()
    const fetchMock = setupFetchMock()
    const { getLatestPosts } = await import("./wp")

    await getLatestPosts("sz", 3)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://newsonafrica.com/sz/wp-json/wp/v2/posts?per_page=3&_embed=1&order=desc&orderby=date",
      expect.any(Object),
    )
  })
})
