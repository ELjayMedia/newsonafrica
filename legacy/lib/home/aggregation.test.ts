import { describe, expect, it } from "vitest"

import type { HomePost } from "@/types/home"
import { selectBestHomeFeedCandidate } from "./aggregation"

const makePost = (id: string): HomePost => ({
  id,
  slug: id,
  title: id,
  excerpt: id,
  date: "2024-01-01T00:00:00.000Z",
})

describe("selectBestHomeFeedCandidate", () => {
  it("prioritizes frontpage candidate over larger lower-priority sources", () => {
    const result = selectBestHomeFeedCandidate([
      { source: "recent", posts: [makePost("recent-1"), makePost("recent-2")] },
      { source: "tagged", posts: [makePost("tagged-1"), makePost("tagged-2"), makePost("tagged-3")] },
      { source: "frontpage", posts: [makePost("frontpage-1")] },
    ])

    expect(result?.source).toBe("frontpage")
    expect(result?.posts.map((post) => post.slug)).toEqual(["frontpage-1"])
  })

  it("returns null when every candidate is empty or missing", () => {
    const result = selectBestHomeFeedCandidate([null, undefined])

    expect(result).toBeNull()
  })
})
