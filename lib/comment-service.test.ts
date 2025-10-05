import { beforeEach, describe, expect, it, vi } from "vitest"

const columnExistsMock = vi.fn(async () => false)

const statusFilters: Array<{ table: string; value: any }> = []

interface SupabaseResponse {
  data?: any
  error?: any
  count?: number | null
}

let supabaseResponses: Record<string, Array<() => SupabaseResponse>> = {}

const createBuilder = (table: string) => {
  const promise = new Promise<SupabaseResponse>((resolve, reject) => {
    const queue = supabaseResponses[table]

    if (!queue || queue.length === 0) {
      reject(new Error(`No mock response configured for table ${table}`))
      return
    }

    const responseFactory = queue.shift()!

    Promise.resolve(responseFactory())
      .then((result) => resolve(result))
      .catch((error) => reject(error))
  })

  const builder: any = {
    select: () => builder,
    eq: (column: string, value: any) => {
      if (column === "status") {
        statusFilters.push({ table, value })
      }
      return builder
    },
    is: () => builder,
    in: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
  }

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  return builder
}

vi.mock("@/utils/supabase-query-utils", () => ({
  clearQueryCache: vi.fn(),
  columnExists: columnExistsMock,
}))

const supabaseMock = {
  from: vi.fn((table: string) => createBuilder(table)),
}

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
}))

describe("comment-service schema checks", () => {
  beforeEach(() => {
    vi.resetModules()
    columnExistsMock.mockReset()
    columnExistsMock.mockResolvedValue(false)
    supabaseMock.from.mockClear()
    statusFilters.length = 0
    supabaseResponses = {}
  })

  it("returns false for missing columns and skips status filters", async () => {
    columnExistsMock.mockResolvedValue(false)

    supabaseResponses = {
      comments: [
        () => ({ data: [], error: null, count: 1 }),
        () => ({
          data: [
            {
              id: "comment-1",
              post_id: "post-1",
              parent_id: null,
              user_id: "user-1",
              content: "Hello",
              created_at: "2024-01-01T00:00:00.000Z",
              status: null,
              is_rich_text: null,
            },
          ],
          error: null,
        }),
        () => ({ data: [], error: null }),
      ],
      profiles: [
        () => ({ data: [], error: null }),
      ],
    }

    const { fetchComments, __testables } = await import("@/lib/comment-service")

    __testables.resetColumnCache()
    const columnInfo = await __testables.checkColumns()

    expect(columnExistsMock).toHaveBeenCalledWith("comments", "status")
    expect(columnExistsMock).toHaveBeenCalledWith("comments", "is_rich_text")
    expect(columnInfo).toEqual({ hasStatus: false, hasRichText: false })

    const result = await fetchComments("post-1")

    expect(statusFilters).toHaveLength(0)
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0].is_rich_text).toBe(false)
    expect(result.total).toBe(1)
  })
})
