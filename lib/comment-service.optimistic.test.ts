import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createOptimisticComment } from "@/lib/comment-service"

const baseComment = {
  post_id: "post-1",
  user_id: "user-1",
  content: "Hello world",
  parent_id: null,
  is_rich_text: false,
}

describe("createOptimisticComment", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("generates unique optimistic IDs when crypto.randomUUID is available", () => {
    const commentA = createOptimisticComment({ ...baseComment }, "alice")
    const commentB = createOptimisticComment({ ...baseComment }, "alice")

    expect(commentA.id).not.toEqual(commentB.id)
    expect(commentA.id).toMatch(/^optimistic-/)
    expect(commentB.id).toMatch(/^optimistic-/)
  })

  it("falls back to a timestamp-based ID when crypto.randomUUID throws", () => {
    const randomUUIDSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockImplementation(() => {
        throw new Error("nope")
      })

    const comment = createOptimisticComment({ ...baseComment }, "alice")

    expect(comment.id).toMatch(/^optimistic-/)

    randomUUIDSpy.mockRestore()
  })
})
