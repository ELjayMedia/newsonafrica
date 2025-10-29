import { describe, expect, it } from "vitest"

import { derivePagination } from "./pagination"

describe("derivePagination", () => {
  it("limits the returned rows and reports hasMore when extra records exist", () => {
    const rows = [1, 2, 3, 4]
    const { items, pagination } = derivePagination({
      page: 2,
      limit: 3,
      rows,
      cursorEncoder: (value) => JSON.stringify({ last: value }),
    })

    expect(items).toEqual([1, 2, 3])
    expect(pagination.hasMore).toBe(true)
    expect(pagination.nextPage).toBe(3)
    expect(pagination.nextCursor).toBe(JSON.stringify({ last: 3 }))
  })

  it("resets hasMore when the filtered set fits in a single page", () => {
    const rows = [1]
    const { items, pagination } = derivePagination({
      page: 1,
      limit: 5,
      rows,
    })

    expect(items).toEqual([1])
    expect(pagination.hasMore).toBe(false)
    expect(pagination.nextPage).toBeNull()
    expect(pagination.nextCursor).toBeNull()
  })
})
