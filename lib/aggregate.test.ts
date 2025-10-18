import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("./editions", () => ({
  SUPPORTED_COUNTRIES: [
    { code: "sz" },
    { code: "za" },
    { code: "ng" },
  ] as any,
}))

const getLatestPostsMock = vi.hoisted(() => vi.fn())

vi.mock("./wp", async () => {
  const actual = await vi.importActual<typeof import("./wp")>("./wp")
  return {
    ...actual,
    getLatestPosts: getLatestPostsMock,
  }
})

import type { WpPost } from "./wp"
import { getAfricanHomeFeed } from "./aggregate"

const expectedCountryCodes = ["sz", "za", "ng"] as const

const makePost = (id: number, slug: string): WpPost => ({
  id,
  slug,
  link: `https://example.com/${slug}`,
  date: new Date().toISOString(),
  title: { rendered: slug },
})

describe("getAfricanHomeFeed", () => {
  beforeEach(() => {
    getLatestPostsMock.mockReset()
  })

  it("aggregates all configured countries while deduping posts", async () => {
    const postsByCountry: Record<string, WpPost[]> = {
      sz: [makePost(1, "hero"), makePost(2, "shared")],
      za: [makePost(3, "za-unique"), makePost(4, "shared")],
      ng: [makePost(5, "ng-unique")],
    }

    getLatestPostsMock.mockImplementation((country: string) =>
      Promise.resolve(postsByCountry[country] ?? []),
    )

    const feed = await getAfricanHomeFeed()

    expect(getLatestPostsMock).toHaveBeenCalledTimes(expectedCountryCodes.length)
    expect(getLatestPostsMock).toHaveBeenCalledWith("sz", 12)
    expect(getLatestPostsMock).toHaveBeenCalledWith("za", 12)
    expect(getLatestPostsMock).toHaveBeenCalledWith("ng", 12)

    expect(feed.hero).toEqual([postsByCountry.sz[0]])
    expect(feed.secondary).toEqual([
      postsByCountry.sz[1],
      postsByCountry.za[0],
      postsByCountry.ng[0],
    ])
    expect(feed.remainder).toEqual([])
  })
})

