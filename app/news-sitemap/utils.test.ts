import { describe, expect, it } from "vitest"

import type { WordPressPost } from "@/types/wp"
import { buildNewsUrlElement } from "./utils"

const basePost = {
  slug: "my-story",
  databaseId: 88,
  date: "2024-01-01T00:00:00.000Z",
  title: "My Story",
  categories: { nodes: [] },
} as unknown as WordPressPost

describe("buildNewsUrlElement", () => {
  it("uses canonical article path format with databaseId suffix when present", () => {
    const xml = buildNewsUrlElement(basePost, {
      baseUrl: "https://app.newsonafrica.com",
      publicationName: "News On Africa",
      language: "en",
      fallbackCountry: "za",
    })

    expect(xml).toContain("<loc>https://app.newsonafrica.com/za/article/my-story-88</loc>")
  })

  it("uses canonical article path format without suffix when databaseId is missing", () => {
    const xml = buildNewsUrlElement(
      {
        ...basePost,
        databaseId: undefined,
      },
      {
        baseUrl: "https://app.newsonafrica.com",
        publicationName: "News On Africa",
        language: "en",
        fallbackCountry: "za",
      },
    )

    expect(xml).toContain("<loc>https://app.newsonafrica.com/za/article/my-story</loc>")
  })
})
