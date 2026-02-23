import { describe, expect, it } from "vitest"

import { buildArticlePath, normalizeArticleCountrySegment } from "./article-route"

describe("article-route", () => {
  it("normalizes uppercase country segments", () => {
    expect(normalizeArticleCountrySegment("ZA")).toBe("za")
  })

  it("normalizes african edition country segment alias", () => {
    expect(normalizeArticleCountrySegment("african-edition")).toBe("african")
  })

  it("builds stable canonical slug paths with databaseId", () => {
    expect(buildArticlePath({ countryCode: "ZA", slug: "My-Story", databaseId: 42 })).toBe(
      "/za/article/my-story-42",
    )
  })
})
