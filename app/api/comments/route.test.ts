import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { cacheTags } from "@/lib/cache"

interface CommentReportRecord {
  id: string
  comment_id: string
  reported_by: string
  reason: string | null
  created_at: string
}

interface CommentRecord {
  id: string
  post_id: string
  user_id: string
  status: string
  created_at?: string
  country?: string | null
  parent_id?: string | null
  profile?: { username: string; avatar_url?: string } | null
  reports?: CommentReportRecord[] | null
}

interface ProfileRecord {
  id: string
  is_admin?: boolean
  country?: string | null
}

let currentSupabaseClient: any
let isSupabaseAvailable = true

const createSupabaseRouteClientMock = vi.fn(() => {
  if (!isSupabaseAvailable) {
    return null
  }

  return {
    supabase: currentSupabaseClient,
    applyCookies: <T>(response: T) => response,
  }
})

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: createSupabaseRouteClientMock,
}))

const revalidateByTagMock = vi.fn()

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: revalidateByTagMock,
}))

function createCommentsQuery(
  comments: CommentRecord[],
  onRange: (result: CommentRecord[]) => void,
) {
  const eqFilters = new Map<string, string>()
  const nullFilters = new Set<string>()
  let orConditions: Array<{ column: string; value: string }> | null = null

  const applyFilters = () => {
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

    return filtered
  }

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
    order: vi.fn(() => builder),
    range: vi.fn(async (from: number, to: number) => {
      const filtered = applyFilters()
      const sliced = filtered.slice(from, to + 1)
      onRange(sliced)
      return { data: sliced, error: null, count: filtered.length }
    }),
    limit: vi.fn(async (limit: number, options?: { offset?: number }) => {
      const filtered = applyFilters()
      const start = options?.offset ?? 0
      const end = start + limit - 1
      const sliced = filtered.slice(start, end + 1)
      onRange(sliced)
      return { data: sliced, error: null, count: filtered.length }
    }),
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
      if (["comments", "comments_view", "comment_list_view", "comments_list_view"].includes(table)) {
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
    isSupabaseAvailable = true
    createSupabaseRouteClientMock.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("returns 503 when Supabase is unavailable", async () => {
    isSupabaseAvailable = false

    const { GET } = await import("./route")
    const request = createRequest("")

    const response = await GET(request)

    expect(response.status).toBe(503)
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
    expect(response.headers.get("cache-control")).toBe("no-store")

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
    expect(response.headers.get("cache-control")).toBe("no-store")

    const filteredComments = currentSupabaseClient.getLastCommentsResult()
    const returnedIds = filteredComments.map((comment) => comment.id)
    expect(returnedIds).toContain("comment-user-flagged")
    expect(returnedIds).toContain("comment-active")
    expect(returnedIds).not.toContain("comment-other-flagged")
  })

  it("returns report summaries when report data is present", async () => {
    const comments: CommentRecord[] = [
      {
        id: "comment-with-reports",
        post_id: "post-1",
        user_id: "user-2",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        parent_id: null,
        profile: { username: "user2" },
        reports: [
          {
            id: "report-1",
            comment_id: "comment-with-reports",
            reported_by: "user-3",
            reason: "spam",
            created_at: "2024-01-02T00:00:00Z",
          },
          {
            id: "report-2",
            comment_id: "comment-with-reports",
            reported_by: "user-4",
            reason: "spam",
            created_at: "2024-01-03T00:00:00Z",
          },
          {
            id: "report-3",
            comment_id: "comment-with-reports",
            reported_by: "user-5",
            reason: null,
            created_at: "2024-01-04T00:00:00Z",
          },
        ],
      },
    ]

    currentSupabaseClient = createSupabaseClient({ session: null, comments, profile: null })

    const { GET } = await import("./route")

    const response = await GET(createRequest(""))

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      success: boolean
      data: { comments: Array<{ reports: CommentReportRecord[]; report_summary?: { total: number; reasons: Array<{ reason: string | null; count: number }> } }> }
    }

    expect(body.success).toBe(true)
    expect(body.data.comments).toHaveLength(1)
    const [comment] = body.data.comments
    expect(comment.reports).toHaveLength(3)
    expect(comment.report_summary).toEqual({
      total: 3,
      reasons: [
        { reason: "spam", count: 2 },
        { reason: null, count: 1 },
      ],
    })
  })

  it("returns a validation error when the postId is missing", async () => {
    const { GET } = await import("./route")

    const response = await GET(new NextRequest("https://example.com/api/comments"))

    expect(response.status).toBe(400)
    expect(response.headers.get("cache-control")).toBe("no-store")

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
    profileError = null,
    onInsert,
  }: {
    session: { user: { id: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } }
    profile: ProfileRecord | null
    profileError?: { message: string } | null
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
            maybeSingle: vi.fn(async () => ({
              data: profile,
              error: profileError,
            })),
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

  it("includes the profile edition when inserting a comment", async () => {
    const onInsert = vi.fn()

    currentSupabaseClient = createPostSupabaseClient({
      session: { user: { id: "user-1", app_metadata: {}, user_metadata: {} } },
      profile: { id: "user-1", country: "sz" },
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
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "sz",
      }),
    )
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.comments("sz", "post-1"))
  })

  it("falls back to the primary edition when no country context is available", async () => {
    const onInsert = vi.fn()

    currentSupabaseClient = createPostSupabaseClient({
      session: { user: { id: "user-1", app_metadata: {}, user_metadata: {} } },
      profile: null,
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
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "african-edition",
      }),
    )
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(
      cacheTags.comments("african-edition", "post-1"),
    )
  })
})

describe("PATCH /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSupabaseClient = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  function createPatchSupabaseClient({
    session,
    comment,
    onCommentUpdate = vi.fn(),
    onReportInsert = vi.fn(),
    reportError = null,
  }: {
    session: { user: { id: string } }
    comment: CommentRecord
    onCommentUpdate?: (payload: Record<string, unknown>) => void
    onReportInsert?: (payload: Record<string, unknown>) => void
    reportError?: { code?: string; message: string } | null
  }) {
    const selectBuilder: any = {
      eq: vi.fn(() => selectBuilder),
      single: vi.fn(async () => ({ data: comment, error: null })),
    }

    const commentsBuilder: any = {
      select: vi.fn(() => selectBuilder),
      update: vi.fn((payload: Record<string, unknown>) => ({
        eq: vi.fn(async () => {
          onCommentUpdate(payload)
          return { error: null }
        }),
      })),
    }

    const reportsBuilder: any = {
      insert: vi.fn(async (payload: Record<string, unknown>) => {
        onReportInsert(payload)
        return { error: reportError }
      }),
    }

    return {
      auth: {
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === "comments") {
          return commentsBuilder
        }

        if (table === "comment_reports") {
          return reportsBuilder
        }

        throw new Error(`Unexpected table ${table}`)
      }),
      getReportBuilder: () => reportsBuilder,
    }
  }

  it("revalidates the edition scoped comment tag", async () => {
    const comment: CommentRecord = {
      id: "comment-1",
      post_id: "post-123",
      user_id: "user-1",
      status: "active",
      country: "ng",
    }

    currentSupabaseClient = createPatchSupabaseClient({
      session: { user: { id: "user-1" } },
      comment,
    })

    const { PATCH } = await import("./route")

    const response = await PATCH(
      new NextRequest("https://example.com/api/comments", {
        method: "PATCH",
        body: JSON.stringify({ id: "comment-1", action: "delete" }),
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(revalidateByTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateByTagMock).toHaveBeenCalledWith(
      cacheTags.comments("ng", "post-123"),
    )
  })

  it("records comment reports and flags active comments", async () => {
    const onReportInsert = vi.fn()
    const onCommentUpdate = vi.fn()
    const comment: CommentRecord = {
      id: "comment-1",
      post_id: "post-123",
      user_id: "user-2",
      status: "active",
      country: "ng",
    }

    currentSupabaseClient = createPatchSupabaseClient({
      session: { user: { id: "reporter" } },
      comment,
      onReportInsert,
      onCommentUpdate,
    })

    const { PATCH } = await import("./route")

    const response = await PATCH(
      new NextRequest("https://example.com/api/comments", {
        method: "PATCH",
        body: JSON.stringify({ id: "comment-1", action: "report", reason: "spam" }),
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    const result = (await response.json()) as { success: boolean; data: { success: boolean; action: string; reportCreated?: boolean; statusUpdated?: boolean } }
    expect(result.data.action).toBe("report")
    expect(result.data.reportCreated).toBe(true)
    expect(result.data.statusUpdated).toBe(true)
    expect(onReportInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: "comment-1",
        reported_by: "reporter",
        reason: "spam",
      }),
    )
    expect(onCommentUpdate).toHaveBeenCalledWith({ status: "flagged" })
    expect(revalidateByTagMock).toHaveBeenCalledWith(cacheTags.comments("ng", "post-123"))
  })

  it("does not change status when reporting an already moderated comment", async () => {
    const onReportInsert = vi.fn()
    const onCommentUpdate = vi.fn()
    const comment: CommentRecord = {
      id: "comment-1",
      post_id: "post-123",
      user_id: "user-2",
      status: "flagged",
      country: "ng",
    }

    currentSupabaseClient = createPatchSupabaseClient({
      session: { user: { id: "reporter" } },
      comment,
      onReportInsert,
      onCommentUpdate,
    })

    const { PATCH } = await import("./route")

    const response = await PATCH(
      new NextRequest("https://example.com/api/comments", {
        method: "PATCH",
        body: JSON.stringify({ id: "comment-1", action: "report", reason: "spam" }),
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(200)
    expect(onReportInsert).toHaveBeenCalled()
    expect(onCommentUpdate).not.toHaveBeenCalled()
  })
})
