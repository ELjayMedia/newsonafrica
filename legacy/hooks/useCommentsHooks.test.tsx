import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Comment } from "@/lib/supabase-schema"
import { useCommentsQuery } from "@/hooks/useCommentsQuery"
import { useCommentsRealtimeSync } from "@/hooks/useCommentsRealtimeSync"
import { useOptimisticComments } from "@/hooks/useOptimisticComments"

const {
  fetchCommentsPageActionMock,
  channelOnMock,
  channelSubscribeMock,
  removeChannelMock,
  channelMock,
  supabaseChannelMock,
} = vi.hoisted(() => {
  const fetchMock = vi.fn()
  const onMock = vi.fn()
  const subscribeMock = vi.fn()
  const removeMock = vi.fn()
  const localChannel = {
    on: onMock,
    subscribe: subscribeMock,
  }

  return {
    fetchCommentsPageActionMock: fetchMock,
    channelOnMock: onMock,
    channelSubscribeMock: subscribeMock,
    removeChannelMock: removeMock,
    channelMock: localChannel,
    supabaseChannelMock: vi.fn(() => localChannel),
  }
})

vi.mock("@/app/(public)/[countryCode]/article/[slug]/actions", () => ({
  fetchCommentsPageAction: fetchCommentsPageActionMock,
}))

vi.mock("@/lib/supabase/browser-helpers", () => ({
  supabase: {
    channel: supabaseChannelMock,
    removeChannel: removeChannelMock,
  },
}))

const buildComment = (id: string): Comment => ({
  id,
  wp_post_id: "post-1",
  edition_code: "za",
  user_id: "user-1",
  body: `comment-${id}`,
  parent_id: null,
  created_at: "2025-01-01T00:00:00.000Z",
  status: "active",
  is_rich_text: false,
  reactions_count: 0,
  replies_count: 0,
  reactions: [],
})

describe("useCommentsQuery", () => {
  beforeEach(() => {
    fetchCommentsPageActionMock.mockReset()
  })

  it("loads paginated comments and appends next pages", async () => {
    fetchCommentsPageActionMock
      .mockResolvedValueOnce({ comments: [buildComment("1")], hasMore: true, nextCursor: "c1", total: 2 })
      .mockResolvedValueOnce({ comments: [buildComment("2")], hasMore: false, nextCursor: null, total: 2 })

    const { result } = renderHook(() =>
      useCommentsQuery({ postId: "post-1", editionCode: "za", sortOption: "newest", initialComments: [] }),
    )

    await waitFor(() => expect(result.current.comments.map((comment) => comment.id)).toEqual(["1"]))

    act(() => {
      result.current.loadMoreComments()
    })

    await waitFor(() => expect(result.current.comments.map((comment) => comment.id)).toEqual(["1", "2"]))
    expect(fetchCommentsPageActionMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: "c1", page: 1 }))
  })


  it("uses bounded retries with backoff delays", async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined)

    fetchCommentsPageActionMock
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValueOnce({ comments: [buildComment("ok")], hasMore: false, nextCursor: null, total: 1 })

    const { result } = renderHook(() =>
      useCommentsQuery({
        postId: "post-1",
        editionCode: "za",
        sortOption: "newest",
        initialComments: [],
        sleep: sleepMock,
        retryDelayMs: 50,
        maxRetries: 3,
      }),
    )

    await waitFor(() => expect(result.current.comments[0]?.id).toBe("ok"))

    expect(fetchCommentsPageActionMock).toHaveBeenCalledTimes(3)
    expect(sleepMock).toHaveBeenNthCalledWith(1, 50)
    expect(sleepMock).toHaveBeenNthCalledWith(2, 100)
  })

  it("refetches when sort option changes", async () => {
    fetchCommentsPageActionMock
      .mockResolvedValueOnce({ comments: [buildComment("newest")], hasMore: false, nextCursor: null, total: 1 })
      .mockResolvedValueOnce({ comments: [buildComment("oldest")], hasMore: false, nextCursor: null, total: 1 })

    const { result, rerender } = renderHook(
      ({ sortOption }) => useCommentsQuery({ postId: "post-1", editionCode: "za", sortOption, initialComments: [] }),
      { initialProps: { sortOption: "newest" as const } },
    )

    await waitFor(() => expect(result.current.comments[0]?.id).toBe("newest"))

    rerender({ sortOption: "oldest" })

    await waitFor(() => expect(result.current.comments[0]?.id).toBe("oldest"))
    expect(fetchCommentsPageActionMock).toHaveBeenLastCalledWith(expect.objectContaining({ sortOption: "oldest" }))
  })
})

describe("useOptimisticComments", () => {
  it("rolls back failed optimistic comments", async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useOptimisticComments([buildComment("base")]))

    act(() => {
      result.current.addOptimisticComment({ ...buildComment("optimistic"), isOptimistic: true })
    })

    expect(result.current.renderedComments.map((comment) => comment.id)).toEqual(["optimistic", "base"])

    act(() => {
      result.current.rollbackOptimisticComment("optimistic", 100)
    })

    expect(result.current.failedCommentSet.has("optimistic")).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.renderedComments.map((comment) => comment.id)).toEqual(["base"])
    expect(result.current.failedCommentSet.has("optimistic")).toBe(false)

    vi.useRealTimers()
  })
})

describe("useCommentsRealtimeSync", () => {
  beforeEach(() => {
    channelOnMock.mockReset()
    channelSubscribeMock.mockReset()
    supabaseChannelMock.mockClear()
    removeChannelMock.mockReset()

    channelOnMock.mockReturnValue(channelMock)
    channelSubscribeMock.mockReturnValue(channelMock)
  })

  it("merges insert/update and delete payloads incrementally", () => {
    let realtimeHandler: ((payload: { eventType?: "INSERT" | "UPDATE" | "DELETE"; new?: Comment; old?: { id?: string } }) => void) | undefined

    channelOnMock.mockImplementation((_event, _filter, handler) => {
      realtimeHandler = handler
      return channelMock
    })

    const upsertComment = vi.fn()
    const removeComment = vi.fn()

    const { unmount } = renderHook(() =>
      useCommentsRealtimeSync({
        postId: "post-1",
        upsertComment,
        removeComment,
      }),
    )

    act(() => {
      realtimeHandler?.({ eventType: "INSERT", new: buildComment("i1") })
      realtimeHandler?.({ eventType: "UPDATE", new: buildComment("u1") })
      realtimeHandler?.({ eventType: "DELETE", old: { id: "d1" } })
    })

    expect(upsertComment).toHaveBeenCalledTimes(2)
    expect(removeComment).toHaveBeenCalledWith("d1")

    unmount()
    expect(removeChannelMock).toHaveBeenCalledWith(channelMock)
  })
})
