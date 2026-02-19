import type { PostgrestError, Session, SupabaseClient } from "@supabase/supabase-js"

import { executeListQuery } from "@/lib/supabase/list-query"
import { buildCursorConditions, decodeCommentCursor, encodeCommentCursor } from "@/lib/comment-cursor"
import type { Comment, CommentReactionType } from "@/lib/supabase-schema"
import type { Database } from "@/types/supabase"
import { normalizeEditionCode, type CommentAction, type CommentStatus } from "./validators"
import { AFRICAN_EDITION } from "@/lib/editions"
import { cacheTags } from "@/lib/cache"

const COMMENT_SELECT =
  "id, wp_post_id, edition_code, user_id, body, parent_id, status, created_at, reported_by, report_reason, reviewed_at, reviewed_by, replies_count, reactions_count, is_rich_text, profile:profiles(username, avatar_url)"

const COMMENT_STATUSES: CommentStatus[] = ["active", "pending", "flagged", "deleted", "all"]

function isValidStatus(status: string): status is CommentStatus {
  return COMMENT_STATUSES.includes(status as CommentStatus)
}

async function isModerator(supabase: SupabaseClient<Database>, session: Session | null): Promise<boolean> {
  if (!session?.user) return false
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()
  return Boolean((data as { is_admin?: boolean | null } | null)?.is_admin)
}

function applyVisibility(
  query: any,
  status: CommentStatus,
  session: Session | null,
  moderator: boolean,
): any {
  if (!session?.user) {
    return query.eq("status", status === "all" ? "active" : status)
  }

  if (moderator) {
    return status === "all" ? query : query.eq("status", status)
  }

  if (status === "all") {
    return query.or(`status.eq.active,user_id.eq.${session.user.id}`)
  }

  if (status === "active") {
    return query.eq("status", "active")
  }

  return query.eq("status", status).eq("user_id", session.user.id)
}

async function attachReactionAggregation(
  supabase: SupabaseClient<Database>,
  comments: Comment[],
  session: Session | null,
): Promise<Comment[]> {
  if (comments.length === 0) return comments

  const ids = comments.map((comment) => comment.id)
  let data: Array<{ comment_id: string; reaction_type: string; user_id: string }> | null = null

  try {
    const response = await supabase
      .from("comment_reactions")
      .select("comment_id, reaction_type, user_id")
      .in("comment_id", ids)

    if (response.error || !response.data) {
      return comments.map((comment) => ({ ...comment, reactions: [], user_reaction: null }))
    }

    data = response.data as Array<{ comment_id: string; reaction_type: string; user_id: string }>
  } catch {
    return comments.map((comment) => ({ ...comment, reactions: [], user_reaction: null }))
  }

  const map = new Map<string, Map<string, { count: number; reactedByCurrentUser: boolean }>>()

  const reactionRows = data ?? []

  for (const row of reactionRows) {
    const commentMap = map.get(row.comment_id) ?? new Map<string, { count: number; reactedByCurrentUser: boolean }>()
    const entry = commentMap.get(row.reaction_type) ?? { count: 0, reactedByCurrentUser: false }
    entry.count += 1
    if (session?.user.id && row.user_id === session.user.id) {
      entry.reactedByCurrentUser = true
    }
    commentMap.set(row.reaction_type, entry)
    map.set(row.comment_id, commentMap)
  }

  return comments.map((comment) => {
    const reactions = map.get(comment.id)
    if (!reactions) {
      return { ...comment, reactions: [], user_reaction: null }
    }

    let userReaction: CommentReactionType | null = null
    const normalized = [...reactions.entries()].map(([type, value]) => {
      if (value.reactedByCurrentUser) userReaction = type as CommentReactionType
      return { type: type as CommentReactionType, count: value.count, reactedByCurrentUser: value.reactedByCurrentUser }
    })

    return {
      ...comment,
      reactions: normalized,
      user_reaction: userReaction,
      reactions_count: normalized.reduce((sum, item) => sum + item.count, 0),
    }
  })
}

export async function listCommentsService(
  supabase: SupabaseClient<Database>,
  params: {
    wpPostId: string
    editionCode: string
    limit: number
    page: number
    parentId?: string | null
    status: CommentStatus
    cursor?: string
    session: Session | null
  },
) {
  const decodedCursor = params.cursor ? decodeCommentCursor(params.cursor) : null
  if (params.cursor && (!decodedCursor || decodedCursor.sort !== "newest")) {
    throw new Error("Invalid cursor")
  }

  const moderator = await isModerator(supabase, params.session)
  const cursorConditions = buildCursorConditions("newest", decodedCursor)

  const applyBase = (query: any, includeCursor: boolean) => {
    let built = query.eq("wp_post_id", params.wpPostId).eq("edition_code", params.editionCode)
    built = params.parentId === null ? built.is("parent_id", null) : params.parentId ? built.eq("parent_id", params.parentId) : built
    built = applyVisibility(built, params.status, params.session, moderator)

    if (includeCursor && cursorConditions.length > 0) {
      built = built.or(cursorConditions.join(","))
    }

    return built
  }

  const { data, error } = (await executeListQuery(supabase, "comments", (query) =>
    applyBase(query.select(COMMENT_SELECT), true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(params.limit + 1),
  )) as { data: Comment[] | null; error: PostgrestError | null }

  if (error) throw new Error(`Failed to fetch comments: ${error.message}`)

  const comments = data ?? []
  const hasMore = comments.length > params.limit
  const limited = hasMore ? comments.slice(0, params.limit) : comments
  const last = limited[limited.length - 1]

  let totalCount: number | undefined
  if (params.page === 0) {
    const countQuery = applyBase(
      supabase.from("comments").select("id", { count: "exact", head: true }),
      false,
    )
    const { count } = await countQuery
    totalCount = typeof count === "number" ? count : 0
  }

  const withReactions = await attachReactionAggregation(supabase, limited, params.session)

  return {
    comments: withReactions,
    hasMore,
    totalCount,
    nextCursor:
      hasMore && last?.created_at && last?.id
        ? encodeCommentCursor({ sort: "newest", createdAt: String(last.created_at), id: String(last.id) })
        : null,
  }
}

export async function createCommentService(
  supabase: SupabaseClient<Database>,
  params: { wpPostId: string; editionCode: string | null; userId: string; body: string; parentId: string | null; isRichText: boolean },
) {
  const edition = normalizeEditionCode(params.editionCode) ?? AFRICAN_EDITION.code
  const { data, error } = await supabase
    .from("comments")
    .insert({
      wp_post_id: params.wpPostId,
      edition_code: edition,
      user_id: params.userId,
      body: params.body,
      parent_id: params.parentId,
      status: "active",
      is_rich_text: params.isRichText,
    })
    .select(COMMENT_SELECT)
    .single()

  if (error || !data) throw new Error(`Failed to create comment: ${error?.message ?? "unknown"}`)

  return {
    comment: {
      ...(data as unknown as Comment),
      reactions: [],
      user_reaction: null,
      reactions_count: data.reactions_count ?? 0,
    },
    cacheTag: cacheTags.comments(edition, params.wpPostId),
  }
}

export async function updateCommentBodyService(
  supabase: SupabaseClient<Database>,
  params: { id: string; userId: string; body: string },
) {
  const { data: found } = await supabase
    .from("comments")
    .select("id, user_id, status")
    .eq("id", params.id)
    .single<{ id: string; user_id: string; status: string }>()

  if (!found) throw new Error("Comment not found")
  if (found.user_id !== params.userId) throw new Error("Unauthorized")
  if (found.status !== "active") throw new Error(`Cannot edit a comment with status: ${found.status}`)

  const { data, error } = await supabase
    .from("comments")
    .update({ body: params.body })
    .eq("id", params.id)
    .select(COMMENT_SELECT)
    .single()

  if (error || !data) throw new Error(`Failed to update comment: ${error?.message ?? "unknown"}`)

  const comment = data as unknown as Comment
  return {
    comment: { ...comment, reactions: [], user_reaction: null, reactions_count: comment.reactions_count ?? 0 },
    cacheTag: cacheTags.comments(comment.edition_code, comment.wp_post_id),
  }
}

export async function applyCommentActionService(
  supabase: SupabaseClient<Database>,
  params: { id: string; action: CommentAction; userId: string; reason?: string },
) {
  const { data: comment } = await supabase
    .from("comments")
    .select("id, user_id, wp_post_id, edition_code")
    .eq("id", params.id)
    .single<{ id: string; user_id: string; wp_post_id: string; edition_code: string | null }>()

  if (!comment) throw new Error("Comment not found")

  const updates: Record<string, unknown> = {}
  if (params.action === "delete") {
    if (comment.user_id !== params.userId) throw new Error("You can only delete your own comments")
    updates.status = "deleted"
  } else if (params.action === "report") {
    updates.status = "flagged"
    updates.reported_by = params.userId
    updates.report_reason = params.reason
  } else if (params.action === "approve") {
    updates.status = "active"
    updates.reviewed_by = params.userId
    updates.reviewed_at = new Date().toISOString()
  }

  const { error } = await supabase.from("comments").update(updates).eq("id", params.id)
  if (error) throw new Error(`Failed to ${params.action} comment: ${error.message}`)

  return { cacheTag: cacheTags.comments(comment.edition_code, comment.wp_post_id) }
}

export async function listAdminCommentsService(
  supabase: SupabaseClient<Database>,
  status: string,
) {
  const resolvedStatus = isValidStatus(status) ? status : "all"
  let query = supabase.from("comments").select(COMMENT_SELECT).order("created_at", { ascending: false })
  if (resolvedStatus !== "all") query = query.eq("status", resolvedStatus)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Comment[]
}

export async function adminUpdateCommentService(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Database["public"]["Tables"]["comments"]["Update"],
) {
  const { data, error } = await supabase.from("comments").update(updates).eq("id", id).select(COMMENT_SELECT).single()
  if (error || !data) throw new Error(error?.message ?? "Failed to update")
  const comment = data as unknown as Comment
  return { comment, cacheTag: cacheTags.comments(comment.edition_code, comment.wp_post_id) }
}

// Migration note: canonical comment-domain entrypoints live in this file.
// Route handlers and client wrappers should call service functions here instead of ad-hoc table orchestration.
