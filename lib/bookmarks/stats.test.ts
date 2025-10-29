import { describe, expect, it } from "vitest"

import { buildBookmarkStats } from "./stats"

describe("buildBookmarkStats", () => {
  it("summarises totals, unread counts and categories", () => {
    const stats = buildBookmarkStats({
      statusRows: [
        { read_status: "read", count: 2 },
        { read_status: "unread", count: 3 },
      ],
      categoryRows: [
        { category: "news", count: 4 },
        { category: "analysis", count: 1 },
      ],
    })

    expect(stats.total).toBe(5)
    expect(stats.unread).toBe(3)
    expect(stats.categories).toEqual({ news: 4, analysis: 1 })
  })

  it("does not leak previous category counts when a filter removes them", () => {
    const first = buildBookmarkStats({
      statusRows: [{ read_status: "read", count: 1 }],
      categoryRows: [{ category: "news", count: 1 }],
    })

    expect(first.categories).toEqual({ news: 1 })

    const filtered = buildBookmarkStats({
      statusRows: [{ read_status: "read", count: 1 }],
      categoryRows: [],
    })

    expect(filtered.categories).toEqual({})
  })
})
