import type { NextRequest, NextResponse } from "next/server"
import type { PostgrestError, Session } from "@supabase/supabase-js"
import { applyRateLimit, handleApiError, successResponse, withCors, logRequest } from "@/lib/api-utils"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { createSupabaseRouteClient } from "@/utils/supabase/route-client"
import { executeListQuery } from "@/lib/supabase/list-query"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS } from "@/lib/editions"
import { buildCursorConditions, decodeCommentCursor, encodeCommentCursor } from "@/lib/comment-cursor"
import {
  ValidationError,
  addValidationError,
  hasValidationErrors,
  type FieldErrors,
} from "@/lib/validation"
import type { CommentListRecord } from "@/types/comments"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

const COMMENT_STATUSES = ["active", "pending", "flagged", "deleted", "all"] as const
const COMMENT_STATUS_SET = new Set(COMMENT_STATUSES)
const COMMENT_ACTIONS = ["report", "delete", "approve"] as const
const COMMENT_ACTION_SET = new Set(COMMENT_ACTIONS)

function applyOrFilters(
  query: any,
  statusConditions: string[],
  cursorConditions: string[],
) {
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

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const
const SUPPORTED_EDITION_CODES = new Set(SUPPORTED_EDITIONS.map((edition) => edition.code.toLowerCase()))

const COMMENT_LIST_SELECT_COLUMNS =
  "id, post_id, user_id, content, parent_id, country, status, created_at, reported_by, report_reason, reviewed_at, reviewed_by, profile:profiles(username, avatar_url)"

function normalizeEditionCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (SUPPORTED_EDITION_CODES.has(normalized)) {
    return normalized
  }

  return null
}

function resolveRequestCountry(request: NextRequest, session: Session | null): string {
  const appMetadataCountry = normalizeEditionCode(session?.user?.app_metadata?.country)
  if (appMetadataCountry) {
    return appMetadataCountry
  }

  const userMetadataCountry = normalizeEditionCode(session?.user?.user_metadata?.country)
  if (userMetadataCountry) {
    return userMetadataCountry
  }

  for (const cookieName of EDITION_COOKIE_KEYS) {
    const cookieValue = request.cookies.get(cookieName)?.value
    const normalized = normalizeEditionCode(cookieValue)
    if (normalized) {
      return normalized
    }
  }

  return AFRICAN_EDITION.code
}

type CommentStatus = (typeof COMMENT_STATUSES)[number]
type CommentAction = (typeof COMMENT_ACTIONS)[number]

function parseParentId(value: string | null): string | null | undefined {
  if (value == null) {
    return undefined
  }

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.toLowerCase() === "null") {
    return null
  }

  return trimmed
}

function validateGetCommentsParams(searchParams: URLSearchParams) {
  const errors: FieldErrors = {}

  const postId = searchParams.get("postId")
  if (!postId) {
    addValidationError(errors, "postId", "Post ID is required")
  }

  const rawPage = searchParams.get("page")
  let page = 0
  if (rawPage != null) {
    const parsed = Number.parseInt(rawPage, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      addValidationError(errors, "page", "Page must be a non-negative integer")
    } else {
      page = parsed
    }
  }

  const rawLimit = searchParams.get("limit")
  let limit = 10
  if (rawLimit != null) {
    const parsed = Number.parseInt(rawLimit, 10)
    if (Number.isNaN(parsed) || parsed <= 0) {
      addValidationError(errors, "limit", "Limit must be a positive integer")
    } else if (parsed > 50) {
      addValidationError(errors, "limit", "Limit cannot be greater than 50")
    } else {
      limit = parsed
    }
  }

  const parentId = parseParentId(searchParams.get("parentId"))

  const rawCursor = searchParams.get("cursor")
  const cursor = rawCursor && rawCursor.trim().length > 0 ? rawCursor.trim() : undefined

  const rawStatus = searchParams.get("status")
  const status = rawStatus ? rawStatus.trim() : "active"

  if (status && !COMMENT_STATUS_SET.has(status as CommentStatus)) {
    addValidationError(errors, "status", "Invalid status value")
  }

  if (hasValidationErrors(errors) || !postId) {
    throw new ValidationError("Invalid query parameters", errors)
  }

  return {
    postId,
    page,
    limit,
    parentId,
    cursor,
    status: (COMMENT_STATUS_SET.has(status as CommentStatus) ? status : "active") as CommentStatus,
  }
}

function validateCreateCommentPayload(payload: unknown) {
  if (payload == null || typeof payload !== "object") {
    throw new ValidationError("Invalid request body", { body: ["Expected an object payload"] })
  }

  const record = payload as Record<string, unknown>
  const errors: FieldErrors = {}

  const postId = typeof record.postId === "string" && record.postId.length > 0 ? record.postId : null
  if (!postId) {
    addValidationError(errors, "postId", "Post ID is required")
  }

  const content = typeof record.content === "string" ? record.content : null
  if (!content || content.length === 0) {
    addValidationError(errors, "content", "Comment content is required")
  } else if (content.length > 2000) {
    addValidationError(errors, "content", "Comment is too long")
  }

  let parentId: string | null | undefined
  if (record.parentId === null) {
    parentId = null
  } else if (typeof record.parentId === "string") {
    parentId = record.parentId
  } else if (record.parentId !== undefined) {
    addValidationError(errors, "parentId", "Parent ID must be a string or null")
  }

  if (hasValidationErrors(errors) || !postId || !content) {
    throw new ValidationError("Invalid comment payload", errors)
  }

  return { postId, content, parentId }
}

function validateUpdateCommentPayload(payload: unknown) {
  if (payload == null || typeof payload !== "object") {
    throw new ValidationError("Invalid request body", { body: ["Expected an object payload"] })
  }

  const record = payload as Record<string, unknown>
  const errors: FieldErrors = {}

  const id = typeof record.id === "string" && record.id.length > 0 ? record.id : null
  if (!id) {
    addValidationError(errors, "id", "Comment ID is required")
  }

  const action = typeof record.action === "string" ? record.action : null
  if (!action || !COMMENT_ACTION_SET.has(action as CommentAction)) {
    addValidationError(errors, "action", "Invalid action")
  }

  const reasonValue = record.reason
  let reason: string | undefined
  if (reasonValue === undefined) {
    reason = undefined
  } else if (typeof reasonValue === "string") {
    reason = reasonValue
  } else {
    addValidationError(errors, "reason", "Reason must be a string")
  }

  if ((action as CommentAction) === "report" && (!reason || reason.length === 0)) {
    addValidationError(errors, "reason", "Report reason is required")
  }

  if (hasValidationErrors(errors) || !id || !action) {
    throw new ValidationError("Invalid comment update payload", errors)
  }

  return { id, action: action as CommentAction, reason }
}

// Get comments for a post with pagination
export async function GET(request: NextRequest): Promise<NextResponse> {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 30, "COMMENTS_GET_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const supabase = createSupabaseRouteClient() as any

    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const { postId, page, limit, parentId, status, cursor: cursorParam } =
      validateGetCommentsParams(searchParams)

    const decodedCursor = cursorParam ? decodeCommentCursor(cursorParam) : null
    if (cursorParam && (!decodedCursor || decodedCursor.sort !== "newest")) {
      throw new ValidationError("Invalid cursor", { cursor: ["Cursor is malformed"] })
    }

    const applyParentFilter = (builder: any) => {
      if (parentId === null) {
        return builder.is("parent_id", null)
      }

      if (parentId) {
        return builder.eq("parent_id", parentId)
      }

      return builder
    }

    const simpleStatusFilters: Array<{ column: string; value: string }> = []
    const statusOrConditions: string[] = []

    const applySimpleStatusFilters = (builder: any) => {
      let updated = builder
      for (const filter of simpleStatusFilters) {
        updated = updated.eq(filter.column, filter.value)
      }
      return updated
    }

    // Build query
    const buildBaseQuery = (builder: any, { includeCursor }: { includeCursor: boolean }) => {
      let updated = builder.eq("post_id", postId)
      updated = applyParentFilter(updated)
      updated = applySimpleStatusFilters(updated)
      return applyOrFilters(updated, statusOrConditions, includeCursor ? cursorConditions : [])
    }

    const {
      data: { session },
    }: { data: { session: Session | null } } = await supabase.auth.getSession()

    let effectiveStatus = status
    let isModerator = false

    if (!session?.user && status === "all") {
      effectiveStatus = "active"
    }

    if (session?.user && status !== "active") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single()

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

    let totalCount: number | undefined

    if (page === 0) {
      const { count, error: countError } = await executeListQuery(
        supabase,
        "comments",
        (query) =>
          buildBaseQuery(query.select("id", { count: "exact", head: true }), { includeCursor: false }),
      )

      if (countError) {
        console.error("Failed to count comments:", countError)
      } else if (typeof count === "number") {
        totalCount = count
      } else {
        totalCount = 0
      }
    }

    if (typedComments.length === 0) {
      return withCors(
        request,
        successResponse({
          comments: [],
          hasMore: false,
          ...(totalCount !== undefined ? { totalCount } : {}),
          nextCursor: null,
        }),
      )
    }

    // Combine comments with profile data
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

    const commentsWithProfiles = limitedComments.map((comment) => {
      return {
        ...comment,
        profile: comment.profile ?? undefined,
      }
    })

    return withCors(
      request,
      successResponse(
        {
          comments: commentsWithProfiles,
          hasMore,
          ...(totalCount !== undefined ? { totalCount } : {}),
          nextCursor,
        },
        {
          pagination: {
            page,
            limit,
          },
        },
      ),
    )
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}

// Create a new comment
export async function POST(request: NextRequest): Promise<NextResponse> {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 5, "COMMENTS_POST_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const supabase = createSupabaseRouteClient() as any

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return withCors(request, handleApiError(new Error("Unauthorized")))
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
    }

    // Validate request body
    const { postId, content, parentId } = validateCreateCommentPayload(body)

    // Rate limiting check - get user's last comment timestamp
    const { data: lastComment, error: lastCommentError } = await supabase
      .from("comments")
      .select("created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const lastCommentRecord = lastComment as { created_at: string } | null

    if (!lastCommentError && lastCommentRecord) {
      const lastCommentTime = new Date(lastCommentRecord.created_at).getTime()
      const currentTime = Date.now()
      const timeDiff = currentTime - lastCommentTime

      // Rate limit: 10 seconds between comments
      if (timeDiff < 10000) {
        return handleApiError(
          new Error(
            `Rate limited. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds before commenting again.`,
          ),
        )
      }
    }

    const requestCountry = resolveRequestCountry(request, session)

    const newComment = {
      post_id: postId,
      user_id: session.user.id,
      content,
      parent_id: parentId || null,
      status: "active",
      country: requestCountry,
    }

    // Insert the comment
    const { data: comment, error } = await supabase.from("comments").insert(newComment).select().single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      // Still return the comment, just without profile data

      revalidateByTag(CACHE_TAGS.COMMENTS)
      return successResponse(comment)
    }

    // Return the comment with profile data
    revalidateByTag(CACHE_TAGS.COMMENTS)
    return successResponse({
      ...comment,
      profile: {
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    })
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}

// Update comment status (report, delete, approve)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  logRequest(request)
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "COMMENTS_PATCH_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const supabase = createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return withCors(request, handleApiError(new Error("Unauthorized")))
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
    }

    // Validate request body
    const { id, action, reason } = validateUpdateCommentPayload(body)

    if (action === "report" && !reason) {
      return handleApiError(new Error("Report reason is required"))
    }

    // Check if the comment exists
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !comment) {
      return withCors(request, handleApiError(new Error("Comment not found")))
    }

    const commentRecord = comment as { user_id?: string | null }

    let updateData = {}

    switch (action) {
      case "report":
        updateData = {
          status: "flagged",
          reported_by: session.user.id,
          report_reason: reason,
        }
        break
      case "delete":
        // Only allow the author to delete their own comment
        if (commentRecord.user_id !== session.user.id) {
          return withCors(request, handleApiError(new Error("You can only delete your own comments")))
        }
        updateData = { status: "deleted" }
        break
      case "approve":
        // Check if user is a moderator (implement your own logic)
        // For now, we'll just check if the user is the author
        if (commentRecord.user_id !== session.user.id) {
          return withCors(request, handleApiError(new Error("You don't have permission to approve this comment")))
        }
        updateData = {
          status: "active",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        }
        break
    }

    // Update the comment
    // @ts-expect-error -- Supabase type inference does not recognize our generic schema in route handlers
    const { error } = await supabase.from("comments").update(updateData).eq("id", id)

    if (error) {
      throw new Error(`Failed to ${action} comment: ${error.message}`)
    }

    revalidateByTag(CACHE_TAGS.COMMENTS)
    return successResponse({ success: true, action })
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}
