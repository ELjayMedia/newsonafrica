import type { SupabaseClient, Session, PostgrestError } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { CommentListRecord } from "@/types/comments"
import { executeListQuery } from "@/lib/supabase/list-query"
import { buildCursorConditions, encodeCommentCursor, type CommentCursor } from "@/lib/comment-cursor"

const COMMENT_LIST_SELECT_COLUMNS =
  "id, wp_post_id, edition_code, user_id, body, parent_id, status, created_at, reported_by, report_reason, reviewed_at, reviewed_by, replies_count, reactions_count, profile:profiles(username, avatar_url)"

type CommentStatus = "active" | "pending" | "flagged" | "deleted" | "all"

interface ListCommentsParams {
  wpPostId: string
  editionCode: string
  limit: number
  parentId?: string | null
  status: CommentStatus
  session: Session | null
  decodedCursor: CommentCursor | null
}

function applyOrFilters(query: any, statusConditions: string[], cursorConditions: string[]) {
  if (statusConditions.length === 0 && cursorConditions.length === 0) {
    return query
  }

  const orGroups: string[] = []

  if (statusConditions.length > 0 && cursorConditions.length > 0) {
    for (const statusCondition of statusConditions) {
      for (const cursorCondition of cursorConditions) {
        orGroups.push(`and(${statusCondition},${cursorCondition})`)
      }
    }
  } else if (statusConditions.length > 0) {
    orGroups.push(...statusConditions)
  } else {
    orGroups.push(...cursorConditions)
  }

  if (orGroups.length > 0) {
    query = query.or(orGroups.join(","))
  }

  return query
}

export async function listComments(supabase: SupabaseClient<Database>, params: ListCommentsParams) {
  const { wpPostId, editionCode, limit, parentId, status, session, decodedCursor } = params

  const simpleStatusFilters: Array<{ column: string; value: string }> = []
  const statusOrConditions: string[] = []

  let effectiveStatus = status
  let isModerator = false

  if (!session?.user && status === "all") {
    effectiveStatus = "active"
  }

  if (session?.user && status !== "active") {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    const isAdmin = (profile as { is_admin?: boolean | null } | null)?.is_admin
    isModerator = Boolean(isAdmin)
  }

  if (!session?.user) {
    simpleStatusFilters.push({ column: "status", value: effectiveStatus })
  } else if (isModerator) {
    if (effectiveStatus !== "all") {
      simpleStatusFilters.push({ column: "status", value: effectiveStatus })
    }
  } else {
    if (effectiveStatus === "all") {
      statusOrConditions.push("status.eq.active")
      statusOrConditions.push(`user_id.eq.${session.user.id}`)
    } else if (effectiveStatus === "active") {
      simpleStatusFilters.push({ column: "status", value: "active" })
    } else {
      simpleStatusFilters.push({ column: "status", value: effectiveStatus })
      simpleStatusFilters.push({ column: "user_id", value: session.user.id })
    }
  }

  const cursorConditions = buildCursorConditions("newest", decodedCursor)

  const applyParentFilter = (builder: any) => {
    if (parentId === null) return builder.is("parent_id", null)
    if (parentId) return builder.eq("parent_id", parentId)
    return builder
  }

  const applySimpleStatusFilters = (builder: any) => {
    let updated = builder
    for (const filter of simpleStatusFilters) {
      updated = updated.eq(filter.column, filter.value)
    }
    return updated
  }

  const buildBaseQuery = (builder: any, { includeCursor }: { includeCursor: boolean }) => {
    let updated = builder.eq("wp_post_id", wpPostId).eq("edition_code", editionCode)
    updated = applyParentFilter(updated)
    updated = applySimpleStatusFilters(updated)
    return applyOrFilters(updated, statusOrConditions, includeCursor ? cursorConditions : [])
  }

  const { data: commentsData, error } = (await executeListQuery(supabase, "comments", (query) => {
    const baseQuery = buildBaseQuery(query.select(COMMENT_LIST_SELECT_COLUMNS), {
      includeCursor: true,
    })

    return baseQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)
  })) as { data: CommentListRecord[] | null; error: PostgrestError | null }

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`)
  }

  const typedComments = (commentsData ?? []) as CommentListRecord[]
  const hasMore = typedComments.length > limit
  const limitedComments = hasMore ? typedComments.slice(0, limit) : typedComments

  const lastComment = limitedComments[limitedComments.length - 1]
  const nextCursor =
    hasMore && lastComment?.created_at && lastComment?.id
      ? encodeCommentCursor({
          sort: "newest",
          createdAt: String(lastComment.created_at),
          id: String(lastComment.id),
        })
      : null

  const commentsWithProfiles = limitedComments.map((comment) => ({
    ...comment,
    profile: comment.profile ?? undefined,
  }))

  return {
    comments: commentsWithProfiles,
    hasMore,
    nextCursor,
    buildBaseQuery,
  }
}

export async function countCommentsIfFirstPage(
  supabase: SupabaseClient<Database>,
  params: Omit<ListCommentsParams, "decodedCursor"> & { page: number; buildBaseQuery?: any },
): Promise<number | undefined> {
  if (params.page !== 0) return undefined

  const { wpPostId, editionCode, parentId, status, session } = params

  const simpleStatusFilters: Array<{ column: string; value: string }> = []
  const statusOrConditions: string[] = []

  let effectiveStatus = status
  let isModerator = false

  if (!session?.user && status === "all") {
    effectiveStatus = "active"
  }

  if (session?.user && status !== "active") {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    const isAdmin = (profile as { is_admin?: boolean | null } | null)?.is_admin
    isModerator = Boolean(isAdmin)
  }

  if (!session?.user) {
    simpleStatusFilters.push({ column: "status", value: effectiveStatus })
  } else if (isModerator) {
    if (effectiveStatus !== "all") {
      simpleStatusFilters.push({ column: "status", value: effectiveStatus })
    }
  } else {
    if (effectiveStatus === "all") {
      statusOrConditions.push("status.eq.active")
      statusOrConditions.push(`user_id.eq.${session.user.id}`)
    } else if (effectiveStatus === "active") {
      simpleStatusFilters.push({ column: "status", value: "active" })
    } else {
      simpleStatusFilters.push({ column: "status", value: effectiveStatus })
      simpleStatusFilters.push({ column: "user_id", value: session.user.id })
    }
  }

  const applyParentFilter = (builder: any) => {
    if (parentId === null) return builder.is("parent_id", null)
    if (parentId) return builder.eq("parent_id", parentId)
    return builder
  }

  const applySimpleStatusFilters = (builder: any) => {
    let updated = builder
    for (const filter of simpleStatusFilters) {
      updated = updated.eq(filter.column, filter.value)
    }
    return updated
  }

  const applyOrFilters = (query: any, conditions: string[]) => {
    if (conditions.length === 0) return query
    return query.or(conditions.join(","))
  }

  let countQuery = supabase.from("comments").select("id", { count: "exact", head: true })
  countQuery = countQuery.eq("wp_post_id", wpPostId).eq("edition_code", editionCode)
  countQuery = applyParentFilter(countQuery)
  countQuery = applySimpleStatusFilters(countQuery)
  countQuery = applyOrFilters(countQuery, statusOrConditions)

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error("Failed to count comments:", countError)
    return 0
  }

  return typeof count === "number" ? count : 0
}

export async function getProfileLite(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, country")
    .eq("id", userId)
    .maybeSingle()

  if (error || !profile) return null
  return profile as { username: string | null; avatar_url: string | null; country: string | null }
}

export async function getLastUserCommentTime(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  const { data: lastComment, error } = await supabase
    .from("comments")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !lastComment) return null

  const record = lastComment as { created_at: string }
  return new Date(record.created_at).getTime()
}
