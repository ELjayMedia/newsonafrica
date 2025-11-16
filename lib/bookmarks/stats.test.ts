import { describe, expect, it } from "vitest"

import { buildBookmarkStats } from "./stats"

describe("buildBookmarkStats", () => {
  it("summarises totals, unread counts, categories, read states and collections", () => {
    const stats = buildBookmarkStats({
      statusRows: [
        { readState: "read", count: 2 },
        { readState: "unread", count: 3 },
        { readState: "in_progress", count: 1 },
      ],
      categoryRows: [
        { category: "news", count: 4 },
        { category: "analysis", count: 1 },
      ],
      collectionRows: [
        { collectionId: "collection-1", readState: "unread", count: 2 },
        { collectionId: "collection-2", readState: "read", count: 1 },
        { collectionId: null, readState: "in_progress", count: 1 },
      ],
    })

    expect(stats.total).toBe(6)
    expect(stats.unread).toBe(4)
    expect(stats.categories).toEqual({ news: 4, analysis: 1 })
    expect(stats.readStates).toEqual({ read: 2, unread: 3, in_progress: 1 })
    expect(stats.collections).toEqual({ "collection-1": 2, __unassigned__: 1 })
  })

  it("does not leak previous category counts when a filter removes them", () => {
    const first = buildBookmarkStats({
      statusRows: [{ readState: "read", count: 1 }],
      categoryRows: [{ category: "news", count: 1 }],
      collectionRows: [],
    })

    expect(first.categories).toEqual({ news: 1 })

    const filtered = buildBookmarkStats({
      statusRows: [{ readState: "read", count: 1 }],
      categoryRows: [],
      collectionRows: [],
    })

    expect(filtered.categories).toEqual({})
  })
})
