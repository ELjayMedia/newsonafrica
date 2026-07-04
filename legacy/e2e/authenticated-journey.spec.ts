import { expect, test } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

type TestEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  email: string
  password: string
}

type TestSession = {
  accessToken: string
  userId: string
}

const REQUIRED_ENV_KEYS = [
  "NOA_E2E_SUPABASE_URL",
  "NOA_E2E_SUPABASE_ANON_KEY",
  "NOA_E2E_USER_EMAIL",
  "NOA_E2E_USER_PASSWORD",
] as const

const env = (): TestEnv | null => {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key])
  if (missing.length > 0) return null

  return {
    supabaseUrl: process.env.NOA_E2E_SUPABASE_URL!,
    supabaseAnonKey: process.env.NOA_E2E_SUPABASE_ANON_KEY!,
    email: process.env.NOA_E2E_USER_EMAIL!,
    password: process.env.NOA_E2E_USER_PASSWORD!,
  }
}

const configuredEnv = env()
const describeAuthenticated = configuredEnv ? test.describe : test.describe.skip

const uniquePostId = () => String(9_000_000 + Math.floor(Math.random() * 999_999))

async function createAuthedClient(config: TestEnv): Promise<{
  client: SupabaseClient
  session: TestSession
}> {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await client.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  })

  if (error || !data.session?.access_token || !data.user?.id) {
    throw new Error(`Unable to create authenticated NOA E2E session: ${error?.message ?? "missing session"}`)
  }

  return {
    client,
    session: {
      accessToken: data.session.access_token,
      userId: data.user.id,
    },
  }
}

async function cleanupRows(client: SupabaseClient, userId: string, wpPostId: string) {
  const { data: comments } = await client
    .from("comments")
    .select("id")
    .eq("user_id", userId)
    .eq("wp_post_id", Number(wpPostId))

  const commentIds = (comments ?? [])
    .map((comment) => (typeof comment.id === "string" ? comment.id : null))
    .filter(Boolean) as string[]

  if (commentIds.length > 0) {
    await client.from("comment_reactions").delete().in("comment_id", commentIds)
    await client.from("comment_reports").delete().in("comment_id", commentIds)
    await client.from("comments").delete().in("id", commentIds)
  }

  await client.from("bookmarks").delete().eq("user_id", userId).eq("wp_post_id", wpPostId)
}

describeAuthenticated("smoke: authenticated reader journeys", () => {
  test("required env vars are documented by the skip guard", async () => {
    expect(configuredEnv).not.toBeNull()
  })

  test("authenticated bookmark and comment APIs write, update, report, and clean up rows", async ({ request }) => {
    const config = configuredEnv!
    const { client, session } = await createAuthedClient(config)
    const wpPostId = uniquePostId()
    const headers = { Authorization: `Bearer ${session.accessToken}` }

    await cleanupRows(client, session.userId, wpPostId)

    try {
      const profile = await client.from("profiles").select("id").eq("id", session.userId).maybeSingle()
      expect(profile.error, profile.error?.message).toBeFalsy()
      expect(profile.data?.id).toBe(session.userId)

      const createBookmark = await request.post("/api/bookmarks", {
        headers,
        data: {
          postId: wpPostId,
          title: `NOA E2E Bookmark ${wpPostId}`,
          slug: `noa-e2e-bookmark-${wpPostId}`,
          excerpt: "Temporary bookmark created by authenticated smoke tests.",
          category: "Testing",
          tags: ["noa-e2e"],
          readState: "unread",
          editionCode: "africa",
        },
      })
      expect(createBookmark.status()).toBeLessThan(300)

      const bookmarkAfterCreate = await client
        .from("bookmarks")
        .select("id, read_state")
        .eq("user_id", session.userId)
        .eq("wp_post_id", wpPostId)
        .maybeSingle()
      expect(bookmarkAfterCreate.error, bookmarkAfterCreate.error?.message).toBeFalsy()
      expect(bookmarkAfterCreate.data?.read_state).toBe("unread")

      const updateBookmark = await request.put("/api/bookmarks", {
        headers,
        data: {
          postId: wpPostId,
          updates: {
            readState: "read",
            note: "Marked read by NOA authenticated E2E smoke test.",
          },
        },
      })
      expect(updateBookmark.status()).toBeLessThan(300)

      const bookmarkAfterUpdate = await client
        .from("bookmarks")
        .select("read_state, note")
        .eq("user_id", session.userId)
        .eq("wp_post_id", wpPostId)
        .maybeSingle()
      expect(bookmarkAfterUpdate.error, bookmarkAfterUpdate.error?.message).toBeFalsy()
      expect(bookmarkAfterUpdate.data?.read_state).toBe("read")

      const createComment = await request.post("/api/comments", {
        headers,
        data: {
          wpPostId,
          editionCode: "africa",
          body: `NOA authenticated E2E comment ${wpPostId}`,
        },
      })
      expect(createComment.status()).toBeLessThan(300)
      const createdComment = await createComment.json()
      const commentId = createdComment?.data?.id
      expect(typeof commentId).toBe("string")

      const commentRow = await client
        .from("comments")
        .select("id, status, reported_by, report_reason")
        .eq("id", commentId)
        .maybeSingle()
      expect(commentRow.error, commentRow.error?.message).toBeFalsy()
      expect(commentRow.data?.status).toBe("active")

      const reportComment = await request.patch("/api/comments", {
        headers,
        data: {
          id: commentId,
          action: "report",
          reason: "NOA authenticated smoke-test report",
        },
      })
      expect(reportComment.status()).toBeLessThan(300)

      const reportedComment = await client
        .from("comments")
        .select("status, reported_by, report_reason")
        .eq("id", commentId)
        .maybeSingle()
      expect(reportedComment.error, reportedComment.error?.message).toBeFalsy()
      expect(reportedComment.data?.status).toBe("flagged")
      expect(reportedComment.data?.reported_by).toBe(session.userId)
      expect(reportedComment.data?.report_reason).toBe("NOA authenticated smoke-test report")

      const deleteBookmark = await request.delete(`/api/bookmarks?postId=${wpPostId}`, { headers })
      expect(deleteBookmark.status()).toBeLessThan(300)

      const bookmarkAfterDelete = await client
        .from("bookmarks")
        .select("id")
        .eq("user_id", session.userId)
        .eq("wp_post_id", wpPostId)
      expect(bookmarkAfterDelete.error, bookmarkAfterDelete.error?.message).toBeFalsy()
      expect(bookmarkAfterDelete.data ?? []).toHaveLength(0)
    } finally {
      await cleanupRows(client, session.userId, wpPostId)
      await client.auth.signOut()
    }
  })
})

test.describe("smoke: authenticated reader journey fixture configuration", () => {
  test("authenticated smoke suite is opt-in and documents required env vars", async () => {
    test.skip(Boolean(configuredEnv), "Authenticated fixture is configured; full suite runs separately.")

    expect(REQUIRED_ENV_KEYS).toEqual([
      "NOA_E2E_SUPABASE_URL",
      "NOA_E2E_SUPABASE_ANON_KEY",
      "NOA_E2E_USER_EMAIL",
      "NOA_E2E_USER_PASSWORD",
    ])
  })
})
