import { makeRoute } from "@/lib/api/route-helpers"
import { successResponse } from "@/lib/api-utils"
import { cacheTags } from "@/lib/cache"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { decodeCommentCursor } from "@/lib/comment-cursor"
import { ValidationError } from "@/lib/validation"

import {
  validateGetCommentsParams,
  validateCreateCommentPayload,
  validateUpdateCommentPayload,
} from "@/lib/comments/validators"
import { resolveRequestEdition } from "@/lib/comments/edition"
import { listComments, countCommentsIfFirstPage, getProfileLite, getLastUserCommentTime } from "@/lib/comments/queries"
import { createComment, updateCommentAction } from "@/lib/comments/actions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const GET_ = makeRoute({ rateLimit: { limit: 30, tokenEnv: "COMMENTS_GET_API_CACHE_TOKEN" } })
const POST_ = makeRoute({ rateLimit: { limit: 5, tokenEnv: "COMMENTS_POST_API_CACHE_TOKEN" }, requireAuth: true })
const PATCH_ = makeRoute({ rateLimit: { limit: 10, tokenEnv: "COMMENTS_PATCH_API_CACHE_TOKEN" }, requireAuth: true })

// Get comments for a post with pagination
export const GET = GET_(async ({ request, supabase, session }) => {
  const { searchParams } = new URL(request.url)
  const params = validateGetCommentsParams(searchParams)

  const decodedCursor = params.cursor ? decodeCommentCursor(params.cursor) : null
  if (params.cursor && (!decodedCursor || decodedCursor.sort !== "newest")) {
    throw new ValidationError("Invalid cursor", { cursor: ["Cursor is malformed"] })
  }

  const { comments, hasMore, nextCursor } = await listComments(supabase, {
    ...params,
    session,
    decodedCursor,
  })

  const totalCount = await countCommentsIfFirstPage(supabase, {
    ...params,
    session,
    decodedCursor: null,
  })

  return successResponse(
    {
      comments,
      hasMore,
      ...(totalCount !== undefined ? { totalCount } : {}),
      nextCursor,
    },
    {
      pagination: { page: params.page, limit: params.limit },
    },
  )
})

// Create a new comment
export const POST = POST_(async ({ request, supabase, session }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
  }

  const { wpPostId, editionCode, body: commentBody, parentId } = validateCreateCommentPayload(body)

  // Rate limiting check - 10 seconds between comments
  const lastCommentTime = await getLastUserCommentTime(supabase, session!.user.id)
  if (lastCommentTime) {
    const timeDiff = Date.now() - lastCommentTime
    if (timeDiff < 10000) {
      throw new Error(
        `Rate limited. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds before commenting again.`,
      )
    }
  }

  const profile = await getProfileLite(supabase, session!.user.id)
  const requestEdition = resolveRequestEdition(request, session, profile?.country)
  const finalEdition = editionCode ?? requestEdition

  const comment = await createComment(supabase, {
    wpPostId,
    editionCode: finalEdition,
    userId: session!.user.id,
    body: commentBody,
    parentId: parentId ?? null,
  })

  revalidateByTag(cacheTags.comments(finalEdition, wpPostId))

  return successResponse({
    ...comment,
    profile: profile ? { username: profile.username, avatar_url: profile.avatar_url } : undefined,
  })
})

// Update comment status (report, delete, approve)
export const PATCH = PATCH_(async ({ request, supabase, session }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
  }

  const { id, action, reason } = validateUpdateCommentPayload(body)

  const result = await updateCommentAction(supabase, {
    id,
    action,
    reason,
    userId: session!.user.id,
  })

  if (result.tagToRevalidate) {
    revalidateByTag(result.tagToRevalidate)
  }

  return successResponse({ success: true, action })
})
