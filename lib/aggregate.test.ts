import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("./editions", async () => {
  const actual = await vi.importActual<typeof import("./editions")>("./editions")
  return {
    ...actual,
    SUPPORTED_COUNTRIES: [
      { code: "sz" },
      { code: "za" },
      { code: "ng" },
    ] as any,
  }
})

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

const makePost = (id: number, slug: string, date = new Date().toISOString()): WpPost => ({
  id: String(id),
  databaseId: id,
  slug,
  link: `https://example.com/${slug}`,
  date,
  title: { rendered: slug },
})

describe("getAfricanHomeFeed", () => {
  beforeEach(() => {
    getLatestPostsMock.mockReset()
  })

  it("aggregates all configured countries while deduping posts", async () => {
    const postsByCountry: Record<string, WpPost[]> = {
      sz: [
        makePost(1, "hero", "2024-03-05T00:00:00.000Z"),
        makePost(2, "shared", "2024-03-04T00:00:00.000Z"),
      ],
      za: [
        makePost(3, "za-unique", "2024-03-03T00:00:00.000Z"),
        makePost(4, "shared", "2024-03-02T00:00:00.000Z"),
      ],
      ng: [makePost(5, "ng-unique", "2024-03-01T00:00:00.000Z")],
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

  it("orders merged posts by recency and selects the newest hero across countries", async () => {
    const postsByCountry: Record<string, WpPost[]> = {
      sz: [makePost(1, "sz-older", "2024-03-01T00:00:00.000Z")],
      za: [makePost(2, "za-newest", "2024-03-06T00:00:00.000Z")],
      ng: [makePost(3, "ng-middle", "2024-03-05T00:00:00.000Z")],
    }

    getLatestPostsMock.mockImplementation((country: string) =>
      Promise.resolve(postsByCountry[country] ?? []),
    )

    const feed = await getAfricanHomeFeed()

    expect(feed.hero).toEqual([postsByCountry.za[0]])
    expect(feed.secondary).toEqual([
      postsByCountry.ng[0],
      postsByCountry.sz[0],
    ])
    expect(feed.remainder).toEqual([])
  })
})
