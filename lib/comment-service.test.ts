import { beforeEach, describe, expect, it, vi } from "vitest"

const fromMock = vi.fn()
const rpcMock = vi.fn()
const authMock = { getUser: vi.fn() }

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
    rpc: (...args: any[]) => rpcMock(...args),
    auth: authMock,
  },
}))

const createQueryBuilder = <T>(result: T) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    limit: vi.fn(() => builder),
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
            post_id: "post-1",
            user_id: "author-1",
            content: "Root comment",
            parent_id: null,
            created_at: "2024-01-01T00:00:00Z",
            status: "active",
            is_rich_text: false,
            reaction_count: 0,
          },
        ],
        error: null,
      }),
      createQueryBuilder({
        data: [
          {
            id: "comment-2",
            post_id: "post-1",
            user_id: "author-2",
            content: "Reply comment",
            parent_id: "comment-1",
            created_at: "2024-01-01T01:00:00Z",
            status: "active",
            is_rich_text: false,
            reaction_count: 0,
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
      if (table === "comments") {
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

    const { comments, total } = await fetchComments("post-1")

    expect(total).toBe(1)
    expect(comments).toHaveLength(1)

    const [rootComment] = comments
    expect(rootComment.reactions).toEqual([
      { type: "like", count: 2, reactedByCurrentUser: true },
      { type: "love", count: 1, reactedByCurrentUser: false },
    ])
    expect(rootComment.reaction_count).toBe(3)
    expect(rootComment.user_reaction).toBe("like")

    expect(rootComment.replies).toHaveLength(1)
    const [reply] = rootComment.replies ?? []
    expect(reply.reactions).toEqual([{ type: "laugh", count: 1, reactedByCurrentUser: true }])
    expect(reply.reaction_count).toBe(1)
    expect(reply.user_reaction).toBe("laugh")
  })
})
