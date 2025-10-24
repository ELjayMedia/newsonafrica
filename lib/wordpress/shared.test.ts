import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import * as wordpressClient from "./client"
import { FP_TAG_SLUG, getFpTagForCountry } from "./shared"
import type { WordPressTag } from "@/types/wp"

const buildTag = (id: number, slug = "fp"): WordPressTag => ({
  id,
  name: `Front Page ${id}`,
  slug,
  taxonomy: "post_tag",
  link: `https://example.com/tag/${slug}`,
  meta: [],
  parent: 0,
  count: 1,
  _links: {},
})

describe("getFpTagForCountry", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetches the FP tag via GraphQL using the provided cache tags", async () => {
    const fetchSpy = vi
      .spyOn(wordpressClient, "fetchFromWpGraphQL")
      .mockResolvedValueOnce({ tag: buildTag(101) })

    const tag = await getFpTagForCountry("za", { tags: ["frontpage"] })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      "za",
      expect.stringContaining("query TagBySlug"),
      { slug: FP_TAG_SLUG },
      ["frontpage"],
    )
    expect(tag?.id).toBe(101)
  })

  it("returns null when the GraphQL response does not include a tag", async () => {
    vi.spyOn(wordpressClient, "fetchFromWpGraphQL").mockResolvedValueOnce({ tag: null })

    const result = await getFpTagForCountry("za")

    expect(result).toBeNull()
  })
})
