import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"

vi.mock("@/lib/wordpress-api", () => ({
  fetchPosts: vi.fn(),
  resolveCountryCode: vi.fn(),
}))

import { hydrateBookmarkRequests, HYDRATE_CONCURRENCY } from "./route"
import { fetchPosts, resolveCountryCode } from "@/lib/wordpress-api"

type FetchPostsInput = { ids: string[]; perPage?: number; countryCode?: string }
type FetchPostsOutput = Array<{ id: string; slug?: string; title?: string; excerpt?: { rendered?: string } | string }>

const mockedFetchPosts = fetchPosts as Mock<[FetchPostsInput], Promise<FetchPostsOutput>>
const mockedResolveCountryCode = resolveCountryCode as Mock<[string], string | undefined>

beforeEach(() => {
  vi.clearAllMocks()
})

describe("hydrateBookmarkRequests", () => {
  it("hydrates posts while respecting the concurrency limit", async () => {
    const requests = [
      { country: "sz", postIds: ["1", "2"] },
      { country: "Nigeria", postIds: ["3"] },
      { country: "za", postIds: ["4", "5"] },
      { country: "Kenya", postIds: ["6"] },
      { country: "gh", postIds: ["7"] },
      { country: "Botswana", postIds: ["8"] },
    ]

    const countryCodeMap: Record<string, string> = {
      nigeria: "ng",
      kenya: "ke",
      botswana: "bw",
    }

    mockedResolveCountryCode.mockImplementation((country: string) => {
      return countryCodeMap[country.toLowerCase()] ?? undefined
    })

    let active = 0
    let maxActive = 0

    mockedFetchPosts.mockImplementation(async ({ ids }: { ids: string[] }) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1

      return ids.map((id) => ({
        id,
        slug: `slug-${id}`,
        title: `Title ${id}`,
        excerpt: { rendered: `Excerpt ${id}` },
      }))
    })

    const posts = await hydrateBookmarkRequests(requests)

    const totalRequestedPosts = requests.reduce((sum, req) => sum + req.postIds.length, 0)
    expect(Object.keys(posts)).toHaveLength(totalRequestedPosts)
    expect(maxActive).toBeLessThanOrEqual(HYDRATE_CONCURRENCY)

    expect(posts["1"]).toMatchObject({
      id: "1",
      country: "sz",
      slug: "slug-1",
      title: "Title 1",
      featuredImage: null,
    })
    expect(posts["3"]).toMatchObject({
      id: "3",
      country: "Nigeria",
      slug: "slug-3",
      title: "Title 3",
    })

    expect(mockedFetchPosts).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["3"], countryCode: "ng", perPage: 1 }),
    )
    expect(mockedFetchPosts).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["4", "5"], countryCode: "za", perPage: 2 }),
    )

    expect(mockedResolveCountryCode).toHaveBeenCalledWith("Nigeria")
    expect(mockedResolveCountryCode).toHaveBeenCalledWith("Kenya")
    expect(mockedResolveCountryCode).toHaveBeenCalledWith("Botswana")
  })
})
