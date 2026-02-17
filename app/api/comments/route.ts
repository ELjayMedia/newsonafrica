import { makeRoute } from "@/lib/api/route-helpers"
import { successResponse, handleApiError, withCors } from "@/lib/api-utils"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { ValidationError } from "@/lib/validation"

import { validateGetCommentsParams, validateCreateCommentPayload, validateUpdateCommentPayload } from "@/lib/comments/validators"
import { resolveRequestEdition } from "@/lib/comments/edition"
import { getProfileLite, getLastUserCommentTime } from "@/lib/comments/queries"
import {
  applyCommentActionService,
  createCommentService,
  listCommentsService,
} from "@/lib/comments/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const GET_ = makeRoute({ rateLimit: { limit: 30, tokenEnv: "COMMENTS_GET_API_CACHE_TOKEN" } })
const POST_ = makeRoute({ rateLimit: { limit: 5, tokenEnv: "COMMENTS_POST_API_CACHE_TOKEN" }, requireAuth: true })
const PATCH_ = makeRoute({ rateLimit: { limit: 10, tokenEnv: "COMMENTS_PATCH_API_CACHE_TOKEN" }, requireAuth: true })

const GET_HANDLER = GET_(async ({ request, supabase, session }) => {
  const { searchParams } = new URL(request.url)
  const params = validateGetCommentsParams(searchParams)

  const { comments, hasMore, nextCursor, totalCount } = await listCommentsService(supabase, {
    ...params,
    session,
    cursor: params.cursor,
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

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    validateGetCommentsParams(searchParams)
  } catch (error) {
    return withCors(request, handleApiError(error))
  }

  return GET_HANDLER(request as any)
}

export const POST = POST_(async ({ request, supabase, session }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
  }

  const { wpPostId, editionCode, body: commentBody, parentId, isRichText } = validateCreateCommentPayload(body)

  const lastCommentTime = await getLastUserCommentTime(supabase, session!.user.id)
  if (lastCommentTime) {
    const timeDiff = Date.now() - lastCommentTime
    if (timeDiff < 10000) {
      throw new Error(`Rate limited. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds before commenting again.`)
    }
  }

  const profile = await getProfileLite(supabase, session!.user.id)
  const requestEdition = resolveRequestEdition(request, session, profile?.country)
  const finalEdition = editionCode ?? requestEdition

  const result = await createCommentService(supabase, {
    wpPostId,
    editionCode: finalEdition,
    userId: session!.user.id,
    body: commentBody,
    parentId: parentId ?? null,
    isRichText,
  })

  revalidateByTag(result.cacheTag)

  return successResponse({
    ...result.comment,
    profile: profile ? { username: profile.username, avatar_url: profile.avatar_url } : undefined,
  })
})

export const PATCH = PATCH_(async ({ request, supabase, session }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid JSON payload", { body: ["Unable to parse request body"] })
  }

  const { id, action, reason } = validateUpdateCommentPayload(body)

  const result = await applyCommentActionService(supabase, {
    id,
    action,
    reason,
    userId: session!.user.id,
  })

  revalidateByTag(result.cacheTag)

  return successResponse({ success: true, action })
})
