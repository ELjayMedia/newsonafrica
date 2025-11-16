import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

const fetchSingleTagMock = vi.fn()
const fetchTaggedPostsMock = vi.fn()
const notFoundMock = vi.fn()

vi.mock("@/lib/wp-server/tags", () => ({
  fetchSingleTag: (...args: unknown[]) => fetchSingleTagMock(...args),
  fetchTaggedPosts: (...args: unknown[]) => fetchTaggedPostsMock(...args),
}))

vi.mock("next/navigation", () => ({
  notFound: (...args: unknown[]) => notFoundMock(...args),
}))

describe("TagPage", () => {
  beforeEach(() => {
    fetchSingleTagMock.mockReset()
    fetchTaggedPostsMock.mockReset()
    notFoundMock.mockReset()
  })

  it("configures incremental static regeneration", async () => {
    const pageModule = await import("./page")

    expect(pageModule.dynamic).toBe("force-static")
    expect(pageModule.revalidate).toBe(CACHE_DURATIONS.MEDIUM)
  })

  it("generates metadata for a tag", async () => {
    fetchSingleTagMock.mockResolvedValue({ name: "Tech", slug: "tech" })

    const { generateMetadata } = await import("./page")
    const metadata = await generateMetadata({ params: { slug: "tech" } })

    expect(fetchSingleTagMock).toHaveBeenCalledWith("tech")
    expect(metadata).toEqual({
      title: "Tech - News On Africa",
      description: "Articles tagged with Tech on News On Africa",
    })
  })

  it("returns not-found metadata when the tag is missing", async () => {
    fetchSingleTagMock.mockResolvedValue(null)

    const { generateMetadata } = await import("./page")
    const metadata = await generateMetadata({ params: { slug: "unknown" } })

    expect(metadata).toEqual({ title: "Tag Not Found" })
  })

  it("renders the tag feed when data is available", async () => {
    fetchSingleTagMock.mockResolvedValue({ name: "Tech", slug: "tech" })
    fetchTaggedPostsMock.mockResolvedValue({
      nodes: [{ id: "1", slug: "post-1" }],
      pageInfo: { hasNextPage: false, endCursor: null },
    })

    const { default: TagPage } = await import("./page")
    const ui = await TagPage({ params: { slug: "tech" } })
    const tagWrapperElement = React.Children.only(ui.props.children) as React.ReactElement
    const result = await tagWrapperElement.type(tagWrapperElement.props)

    expect(fetchSingleTagMock).toHaveBeenCalledWith("tech")
    expect(fetchTaggedPostsMock).toHaveBeenCalledWith({
      slug: "tech",
      countryCode: DEFAULT_COUNTRY,
      first: 10,
    })

    expect(result).toBeDefined()
    expect(result.props).toMatchObject({
      slug: "tech",
      countryCode: DEFAULT_COUNTRY,
      tag: { name: "Tech", slug: "tech" },
      initialData: {
        nodes: [{ id: "1", slug: "post-1" }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it("invokes notFound when the tag cannot be located", async () => {
    const notFoundError = new Error("NEXT_NOT_FOUND")
    notFoundMock.mockImplementation(() => {
      throw notFoundError
    })
    fetchSingleTagMock.mockResolvedValue(null)

    const { default: TagPage } = await import("./page")
    const ui = await TagPage({ params: { slug: "missing" } })
    const tagWrapperElement = React.Children.only(ui.props.children) as React.ReactElement

    await expect(tagWrapperElement.type(tagWrapperElement.props)).rejects.toBe(notFoundError)
    expect(fetchTaggedPostsMock).not.toHaveBeenCalled()
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })
})
