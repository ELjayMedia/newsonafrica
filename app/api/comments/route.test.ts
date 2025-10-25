import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

interface CommentRecord {
  id: string
  post_id: string
  user_id: string
  status: string
  parent_id?: string | null
  profile?: { username: string; avatar_url?: string } | null
}

interface ProfileRecord {
  id: string
  is_admin?: boolean
}

let currentSupabaseClient: any

vi.mock("@/utils/supabase/route-client", () => ({
  createSupabaseRouteClient: () => currentSupabaseClient,
}))

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: vi.fn(),
}))

function createCommentsQuery(
  comments: CommentRecord[],
  onRange: (result: CommentRecord[]) => void,
) {
  const eqFilters = new Map<string, string>()
  const nullFilters = new Set<string>()
  let orConditions: Array<{ column: string; value: string }> | null = null

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: string) => {
      eqFilters.set(column, value)
      return builder
    }),
    is: vi.fn((column: string, value: any) => {
      if (value === null) {
        nullFilters.add(column)
      } else {
        eqFilters.set(column, value)
      }
      return builder
    }),
    or: vi.fn((expression: string) => {
      orConditions = expression.split(",").map((condition) => {
        const [column, operator, value] = condition.split(".")
        if (operator !== "eq") {
          throw new Error(`Unsupported operator: ${operator}`)
        }
        eqFilters.delete(column)
        return { column, value }
      })
      return builder
    }),
    order: vi.fn(() => ({
      range: vi.fn(async (from: number, to: number) => {
        let filtered = comments.slice()

        eqFilters.forEach((value, column) => {
          filtered = filtered.filter((comment) => comment[column as keyof CommentRecord] === value)
        })

        nullFilters.forEach((column) => {
          filtered = filtered.filter((comment) => comment[column as keyof CommentRecord] == null)
        })

        if (orConditions) {
          filtered = filtered.filter((comment) =>
            orConditions!.some(({ column, value }) => comment[column as keyof CommentRecord] === value),
          )
        }

        const sliced = filtered.slice(from, to + 1)
        onRange(sliced)
        return { data: sliced, error: null, count: filtered.length }
      }),
    })),
  }

  return builder
}

function createProfilesQuery(profile: ProfileRecord | null) {
  const eqFilters = new Map<string, string>()

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: string) => {
      eqFilters.set(column, value)
      return builder
    }),
    single: vi.fn(async () => {
      if (!profile) {
        return { data: null, error: { message: "not found" } }
      }

      if (eqFilters.has("id") && eqFilters.get("id") !== profile.id) {
        return { data: null, error: { message: "not found" } }
      }

      return { data: profile, error: null }
    }),
  }

  return builder
}

function createSupabaseClient({
  session,
  comments,
  profile,
}: {
  session: { user: { id: string } } | null
  comments: CommentRecord[]
  profile: ProfileRecord | null
}) {
  let lastCommentsResult: CommentRecord[] = []

  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === "comments") {
        return createCommentsQuery(comments, (result) => {
          lastCommentsResult = result
        })
      }

      if (table === "profiles") {
        return createProfilesQuery(profile)
      }

      throw new Error(`Unexpected table ${table}`)
    }),
    getLastCommentsResult: () => lastCommentsResult,
  }
}

const createRequest = (search: string) =>
  new NextRequest(`https://example.com/api/comments?postId=post-1${search}`)

describe("GET /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSupabaseClient = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("falls back to active comments for unauthenticated status=all requests", async () => {
    const comments: CommentRecord[] = [
      {
        id: "comment-active",
        post_id: "post-1",
        user_id: "user-2",
        status: "active",
        parent_id: null,
        profile: { username: "user2" },
      },
      {
        id: "comment-flagged",
        post_id: "post-1",
        user_id: "user-3",
        status: "flagged",
        parent_id: null,
        profile: { username: "user3" },
      },
    ]

    currentSupabaseClient = createSupabaseClient({ session: null, comments, profile: null })

    const { GET } = await import("./route")

    const response = await GET(createRequest("&status=all"))

    expect(response.status).toBe(200)

    const filteredComments = currentSupabaseClient.getLastCommentsResult()
    expect(filteredComments).toHaveLength(1)
    expect(filteredComments[0].id).toBe("comment-active")
    expect(filteredComments[0].status).toBe("active")
  })

  it("returns an author's moderated comments when authenticated and requesting all statuses", async () => {
    const comments: CommentRecord[] = [
      {
        id: "comment-user-flagged",
        post_id: "post-1",
        user_id: "user-1",
        status: "flagged",
        parent_id: null,
        profile: { username: "author" },
      },
      {
        id: "comment-other-flagged",
        post_id: "post-1",
        user_id: "user-2",
        status: "flagged",
        parent_id: null,
        profile: { username: "other" },
      },
      {
        id: "comment-active",
        post_id: "post-1",
        user_id: "user-3",
        status: "active",
        parent_id: null,
        profile: { username: "third" },
      },
    ]

    currentSupabaseClient = createSupabaseClient({
      session: { user: { id: "user-1" } },
      comments,
      profile: { id: "user-1", is_admin: false },
    })

    const { GET } = await import("./route")

    const response = await GET(createRequest("&status=all"))

    expect(response.status).toBe(200)

    const filteredComments = currentSupabaseClient.getLastCommentsResult()
    const returnedIds = filteredComments.map((comment) => comment.id)
    expect(returnedIds).toContain("comment-user-flagged")
    expect(returnedIds).toContain("comment-active")
    expect(returnedIds).not.toContain("comment-other-flagged")
  })

  it("returns a validation error when the postId is missing", async () => {
    const { GET } = await import("./route")

    const response = await GET(new NextRequest("https://example.com/api/comments"))

    expect(response.status).toBe(400)

    const body = (await response.json()) as { success: boolean; error: string; errors?: Record<string, string[]> }
    expect(body.success).toBe(false)
    expect(body.error).toBe("Invalid query parameters")
    expect(body.errors).toEqual({ postId: ["Post ID is required"] })
  })
})

describe("POST /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSupabaseClient = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  function createPostSupabaseClient({
    session,
    profile,
    onInsert,
  }: {
    session: { user: { id: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } }
    profile: ProfileRecord | null
    onInsert: (payload: Record<string, unknown>) => void
  }) {
    const createCommentsBuilder = () => {
      const builder: any = {}

      builder.select = vi.fn(() => builder)
      builder.eq = vi.fn(() => builder)
      builder.order = vi.fn(() => builder)
      builder.limit = vi.fn(() => builder)
      builder.single = vi.fn(async () => ({ data: null, error: null }))
      builder.insert = vi.fn((payload: Record<string, unknown>) => {
        onInsert(payload)
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: "comment-id" }, error: null })),
          })),
        }
      })

      return builder
    }

    const createProfilesBuilder = () => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: profile, error: profile ? null : { message: "not found" } })),
          })),
        })),
      }
    }

    return {
      auth: {
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === "comments") {
          return createCommentsBuilder()
        }

        if (table === "profiles") {
          return createProfilesBuilder()
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }
  }

  it("includes the session edition when inserting a comment", async () => {
    const onInsert = vi.fn()

    currentSupabaseClient = createPostSupabaseClient({
      session: { user: { id: "user-1", app_metadata: { country: "sz" }, user_metadata: {} } },
      profile: { id: "user-1" },
      onInsert,
    })

    const { POST } = await import("./route")

    const response = await POST(
      new NextRequest("https://example.com/api/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1", content: "Hello world" }),
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "sz",
      }),
    )
  })

  it("falls back to the primary edition when no country context is available", async () => {
    const onInsert = vi.fn()

    currentSupabaseClient = createPostSupabaseClient({
      session: { user: { id: "user-1", app_metadata: {}, user_metadata: {} } },
      profile: { id: "user-1" },
      onInsert,
    })

    const { POST } = await import("./route")

    const response = await POST(
      new NextRequest("https://example.com/api/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1", content: "Hello world" }),
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "african-edition",
      }),
    )
  })
})
