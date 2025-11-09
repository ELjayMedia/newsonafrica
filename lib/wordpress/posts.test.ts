import { afterEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { getRelatedPosts, getRelatedPostsForCountry } from "./posts"
import { fetchWordPressGraphQL } from "./client"

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client")

  return {
    ...actual,
    fetchWordPressGraphQL: vi.fn(),
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("getRelatedPostsForCountry", () => {
  it("passes the related posts timeout to its GraphQL requests", async () => {
    const mockFetch = fetchWordPressGraphQL as unknown as Mock

    mockFetch
      .mockResolvedValueOnce({
        post: {
          categories: { nodes: [{ databaseId: 7 }] },
        },
      })
      .mockResolvedValueOnce({ posts: { nodes: [] } })

    await getRelatedPostsForCountry("sz", "42", 3)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [firstCallOptions, secondCallOptions] = [mockFetch.mock.calls[0]?.[3], mockFetch.mock.calls[1]?.[3]]
    expect(firstCallOptions?.timeout).toBe(1000)
    expect(secondCallOptions?.timeout).toBe(1000)
  })
})

describe("getRelatedPosts", () => {
  it("forwards the related posts timeout when querying by tags", async () => {
    const mockFetch = fetchWordPressGraphQL as unknown as Mock

    mockFetch.mockResolvedValueOnce({ posts: { nodes: [] } })

    await getRelatedPosts("42", [], ["analysis"], 4, "sz")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const requestOptions = mockFetch.mock.calls[0]?.[3]
    expect(requestOptions?.timeout).toBe(1000)
  })
})
