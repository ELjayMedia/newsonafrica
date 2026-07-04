import { describe, expect, it } from "vitest"
import { applyStatsDelta, deriveStatsFromBookmarks } from "./bookmarks-store"

describe("bookmarks-store", () => {
  it("applyStatsDelta merges and prunes zeroed counters", () => {
    const next = applyStatsDelta(
      {
        total: 5,
        unread: 2,
        categories: { News: 3, Sports: 2 },
        readStates: { unread: 2, read: 3 },
        collections: { a: 1, __unassigned__: 1 },
      },
      {
        total: -1,
        unread: -1,
        categories: { Sports: -2, Business: 1 },
        readStates: { unread: -1, read: 1 },
        collections: { __unassigned__: -1, b: 1 },
      },
    )

    expect(next).toEqual({
      total: 4,
      unread: 1,
      categories: { News: 3, Business: 1 },
      readStates: { unread: 1, read: 4 },
      collections: { a: 1, b: 1 },
    })
  })

  it("deriveStatsFromBookmarks aggregates category, read-state and collections", () => {
    const stats = deriveStatsFromBookmarks([
      { category: "News", readState: "unread", collectionId: null },
      { category: "News", readState: "read", collectionId: "col-1" },
      { category: "Tech", readState: "unread", collectionId: "col-1" },
    ])

    expect(stats.total).toBe(3)
    expect(stats.unread).toBe(2)
    expect(stats.categories).toEqual({ News: 2, Tech: 1 })
    expect(stats.readStates.unread).toBe(2)
    expect(stats.readStates.read).toBe(1)
    expect(stats.collections.__unassigned__).toBe(1)
    expect(stats.collections["col-1"]).toBe(1)
  })
})
