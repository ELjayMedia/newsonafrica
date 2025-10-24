import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./client", () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

import { TAG_BY_SLUG_QUERY } from "../wordpress-queries"
import { fetchWordPressGraphQL } from "./client"
import { getFpTagForCountry } from "./shared"

const mockFetchFromWpGraphQL = vi.mocked(fetchWordPressGraphQL)

describe("getFpTagForCountry", () => {
  beforeEach(() => {
    mockFetchFromWpGraphQL.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the GraphQL tag when data is available", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({
      tag: { databaseId: 101, slug: "fp", name: "Front Page" },
    } as any)

    const result = await getFpTagForCountry("za")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      TAG_BY_SLUG_QUERY,
      { slug: "fp" },
      ["country:za", "section:tags", "tag:fp"],
    )
    expect(result).toEqual({ databaseId: 101, id: 101, name: "Front Page", slug: "fp" })
  })

  it("returns null when GraphQL returns no tag", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({ tag: null } as any)

    const result = await getFpTagForCountry("ng")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it("returns null when the GraphQL request throws", async () => {
    mockFetchFromWpGraphQL.mockRejectedValueOnce(new Error("network"))

    const result = await getFpTagForCountry("ke")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
