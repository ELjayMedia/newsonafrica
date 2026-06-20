import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./client", () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

import { TAG_BY_SLUG_QUERY } from "@/lib/wordpress/queries"
import { fetchWordPressGraphQL } from "./client"
import { getFpTagForCountry } from "./shared"
import { CACHE_DURATIONS } from "../cache/constants"

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
      ok: true,
      data: {
        tag: { databaseId: 101, slug: "fp", name: "Front Page" },
      },
    } as any)

    const result = await getFpTagForCountry("za")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalledWith(
      "za",
      TAG_BY_SLUG_QUERY,
      { slug: "fp" },
      {
        revalidate: CACHE_DURATIONS.NONE,
        tags: ["edition:za", "tag:za:fp"],
      },
    )
    expect(result).toEqual({ databaseId: 101, id: 101, name: "Front Page", slug: "fp" })
  })

  it("returns null when GraphQL returns no tag", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({ ok: true, data: { tag: null } } as any)

    const result = await getFpTagForCountry("ng")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalled()
    expect(result).toBeNull()
  })


  it("returns null when GraphQL returns a failure envelope", async () => {
    mockFetchFromWpGraphQL.mockResolvedValueOnce({ ok: false, kind: "http_error", message: "boom" } as any)

    const result = await getFpTagForCountry("ng")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalled()
    expect(result).toBeNull()
  })
  it("returns null when the GraphQL request throws", async () => {
    mockFetchFromWpGraphQL.mockRejectedValueOnce(new Error("network"))

    const result = await getFpTagForCountry("ng")

    expect(mockFetchFromWpGraphQL).toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
