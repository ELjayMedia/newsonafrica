import { beforeEach, describe, expect, it, vi } from "vitest"
import { decodeCommentCursor } from "@/lib/comment-cursor"

const fromMock = vi.fn()
const rpcMock = vi.fn()
const authMock = { getUser: vi.fn() }

vi.mock("@/lib/supabase/browser-helpers", () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
    rpc: (...args: any[]) => rpcMock(...args),
    auth: authMock,
  },
}))

// NOTE: <T,> is important here to avoid TSX/JSX parsing ambiguities ("unbalanced tags")
const createQueryBuilder = <T,>(result: T) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
  }

  return builder
}

describe("fetchComments", () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
    authMock.getUser.mockReset()
    vi.resetModules()
  })

  it("returns reactions for root comments and replies", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })

    const commentBuilders = [
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({ count: 1, error: null }),
      createQueryBuilder({
        data: [
          {
            id: "comment-1",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-1",
            body: "Root comment",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
        ],
        error: null,
      }),
      createQueryBuilder({
        data: [
          {
            id: "comment-2",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-2",
            body: "Reply comment",
            parent_id: "comment-1",
            replies_count: 0,
            created_at: "2024-01-01T01:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
        ],
        error: null,
      }),
    ]

    const profileBuilders = [
      createQueryBuilder({
        data: [
          { id: "author-1", username: "Author One", avatar_url: "avatar-1.png" },
          { id: "author-2", username: "Author Two", avatar_url: "avatar-2.png" },
        ],
        error: null,
      }),
    ]

    const reactionBuilders = [
      createQueryBuilder({
        data: [
          { comment_id: "comment-1", reaction_type: "like", user_id: "user-1" },
          { comment_id: "comment-1", reaction_type: "like", user_id: "user-2" },
          { comment_id: "comment-1", reaction_type: "love", user_id: "user-3" },
          { comment_id: "comment-2", reaction_type: "laugh", user_id: "user-1" },
        ],
        error: null,
      }),
    ]

    const rpcResponses = [
      { data: { exists: true }, error: null },
      { data: { exists: true }, error: null },
    ]

    fromMock.mockImplementation((table: string) => {
      if (["comments", "comments_view", "comment_list_view", "comments_list_view"].includes(table)) {
        const builder = commentBuilders.shift()
        if (!builder) throw new Error("Unexpected comments query")
        return builder
      }

      if (table === "profiles") {
        const builder = profileBuilders.shift()
        if (!builder) throw new Error("Unexpected profiles query")
        return builder
      }

      if (table === "comment_reactions") {
        const builder = reactionBuilders.shift()
        if (!builder) throw new Error("Unexpected reactions query")
        return builder
      }

      throw new Error(`Unhandled table ${table}`)
    })

    rpcMock.mockImplementation((fn: string) => {
      expect(fn).toBe("column_exists")
      const result = rpcResponses.shift()
      if (!result) throw new Error("Unexpected RPC call")
      return {
        single: vi.fn(() => Promise.resolve(result)),
      }
    })

    const { fetchComments } = await import("@/lib/comment-service")

    const { comments, total, hasMore, nextCursor } = await fetchComments("post-1", "ng")

    expect(total).toBe(1)
    expect(hasMore).toBe(false)
    expect(nextCursor).toBeNull()
    expect(comments).toHaveLength(1)

    const [rootComment] = comments
    expect(rootComment.reactions).toEqual([
      { type: "like", count: 2, reactedByCurrentUser: true },
      { type: "love", count: 1, reactedByCurrentUser: false },
    ])
    expect(rootComment.reactions_count).toBe(3)
    expect(rootComment.user_reaction).toBe("like")

    expect(rootComment.replies).toHaveLength(1)
    const [reply] = rootComment.replies ?? []
    expect(reply.reactions).toEqual([{ type: "laugh", count: 1, reactedByCurrentUser: true }])
    expect(reply.reactions_count).toBe(1)
    expect(reply.user_reaction).toBe("laugh")
  })

  it("produces a cursor for newest sort and toggles hasMore when results are exhausted", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const commentBuilders = [
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({ count: 3, error: null }),
      createQueryBuilder({
        data: [
          {
            id: "comment-3",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-3",
            body: "Newest",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-03T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
          {
            id: "comment-2",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-2",
            body: "Second",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-02T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
          {
            id: "comment-1",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-1",
            body: "Oldest",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
        ],
        error: null,
      }),
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({
        data: [
          {
            id: "comment-1",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-1",
            body: "Oldest",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
        ],
        error: null,
      }),
      createQueryBuilder({ data: [], error: null }),
    ]

    const reactionBuilders = [
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({ data: [], error: null }),
    ]

    const rpcResponses = [
      { data: { exists: true }, error: null },
      { data: { exists: true }, error: null },
    ]

    fromMock.mockImplementation((table: string) => {
      if (["comments", "comments_view", "comment_list_view", "comments_list_view"].includes(table)) {
        const builder = commentBuilders.shift()
        if (!builder) throw new Error("Unexpected comments query")
        return builder
      }

      if (table === "comment_reactions") {
        const builder = reactionBuilders.shift()
        if (!builder) throw new Error("Unexpected reactions query")
        return builder
      }

      throw new Error(`Unhandled table ${table}`)
    })

    rpcMock.mockImplementation((fn: string) => {
      expect(fn).toBe("column_exists")
      const result = rpcResponses.shift()
      if (!result) throw new Error("Unexpected RPC call")
      return {
        single: vi.fn(() => Promise.resolve(result)),
      }
    })

    const { fetchComments } = await import("@/lib/comment-service")

    const firstPage = await fetchComments("post-1", "ng", 0, 2)

    expect(firstPage.hasMore).toBe(true)
    expect(firstPage.comments).toHaveLength(2)
    expect(firstPage.total).toBe(3)

    const firstCursor = firstPage.nextCursor
    expect(firstCursor).toBeTruthy()

    const decodedFirstCursor = decodeCommentCursor(firstCursor ?? "")
    expect(decodedFirstCursor).toEqual({ sort: "newest", createdAt: "2024-01-02T00:00:00Z", id: "comment-2" })

    const secondPage = await fetchComments("post-1", "ng", 1, 2, "newest", undefined, firstCursor ?? undefined)

    expect(secondPage.hasMore).toBe(false)
    expect(secondPage.nextCursor).toBeNull()
    expect(secondPage.total).toBeUndefined()
    expect(secondPage.comments).toHaveLength(1)
  })

  it("produces a cursor for oldest sort", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const commentBuilders = [
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({ count: 3, error: null }),
      createQueryBuilder({
        data: [
          {
            id: "comment-1",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-1",
            body: "Oldest",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
          {
            id: "comment-2",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-2",
            body: "Middle",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-02T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
          {
            id: "comment-3",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-3",
            body: "Newest",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-03T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 0,
          },
        ],
        error: null,
      }),
      createQueryBuilder({ data: [], error: null }),
    ]

    const reactionBuilders = [createQueryBuilder({ data: [], error: null })]

    const rpcResponses = [
      { data: { exists: true }, error: null },
      { data: { exists: true }, error: null },
    ]

    fromMock.mockImplementation((table: string) => {
      if (["comments", "comments_view", "comment_list_view", "comments_list_view"].includes(table)) {
        const builder = commentBuilders.shift()
        if (!builder) throw new Error("Unexpected comments query")
        return builder
      }

      if (table === "comment_reactions") {
        const builder = reactionBuilders.shift()
        if (!builder) throw new Error("Unexpected reactions query")
        return builder
      }

      throw new Error(`Unhandled table ${table}`)
    })

    rpcMock.mockImplementation((fn: string) => {
      expect(fn).toBe("column_exists")
      const result = rpcResponses.shift()
      if (!result) throw new Error("Unexpected RPC call")
      return {
        single: vi.fn(() => Promise.resolve(result)),
      }
    })

    const { fetchComments } = await import("@/lib/comment-service")

    const firstPage = await fetchComments("post-1", "ng", 0, 2, "oldest")

    expect(firstPage.hasMore).toBe(true)
    const decodedCursor = decodeCommentCursor(firstPage.nextCursor ?? "")
    expect(decodedCursor).toEqual({ sort: "oldest", createdAt: "2024-01-02T00:00:00Z", id: "comment-2" })
  })

  it("produces a cursor for popular sort including reaction counts", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const commentBuilders = [
      createQueryBuilder({ data: [], error: null }),
      createQueryBuilder({ count: 3, error: null }),
      createQueryBuilder({
        data: [
          {
            id: "comment-1",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-1",
            body: "Popular",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-03T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 5,
          },
          {
            id: "comment-2",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-2",
            body: "Also popular",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-02T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 3,
          },
          {
            id: "comment-3",
            wp_post_id: "post-1",
            edition_code: "ng",
            user_id: "author-3",
            body: "Less popular",
            parent_id: null,
            replies_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reactions_count: 1,
          },
        ],
        error: null,
      }),
      createQueryBuilder({ data: [], error: null }),
    ]

    const reactionBuilders = [createQueryBuilder({ data: [], error: null })]

    const rpcResponses = [
      { data: { exists: true }, error: null },
      { data: { exists: true }, error: null },
    ]

    fromMock.mockImplementation((table: string) => {
      if (["comments", "comments_view", "comment_list_view", "comments_list_view"].includes(table)) {
        const builder = commentBuilders.shift()
        if (!builder) throw new Error("Unexpected comments query")
        return builder
      }

      if (table === "comment_reactions") {
        const builder = reactionBuilders.shift()
        if (!builder) throw new Error("Unexpected reactions query")
        return builder
      }

      throw new Error(`Unhandled table ${table}`)
    })

    rpcMock.mockImplementation((fn: string) => {
      expect(fn).toBe("column_exists")
      const result = rpcResponses.shift()
      if (!result) throw new Error("Unexpected RPC call")
      return {
        single: vi.fn(() => Promise.resolve(result)),
      }
    })

    const { fetchComments } = await import("@/lib/comment-service")

    const firstPage = await fetchComments("post-1", "ng", 0, 2, "popular")

    expect(firstPage.hasMore).toBe(true)
    const decodedCursor = decodeCommentCursor(firstPage.nextCursor ?? "")
    expect(decodedCursor).toEqual({
      sort: "popular",
      reactionCount: 3,
      createdAt: "2024-01-02T00:00:00Z",
      id: "comment-2",
    })
  })
})
