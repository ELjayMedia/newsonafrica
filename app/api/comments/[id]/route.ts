import { makeRoute, routeData, routeError } from "@/lib/api/route-helpers"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { applyCommentActionService, updateCommentBodyService } from "@/lib/comments/service"
import { validateCommentBodyFormatting } from "@/lib/comments/validators"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type CommentRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

const USER_ROUTE = makeRoute<CommentRouteContext>({ auth: "user" })

const messageFromError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

function extractCommentId(params?: Record<string, string | string[] | undefined>) {
  const rawCommentId = params?.id
  return Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId
}

export const PATCH = USER_ROUTE(async ({ request, supabase, session }, context) => {
  const params = await context.params
  const commentId = extractCommentId(params)

  if (!commentId) {
    return routeError("Comment ID is required", { status: 400 })
  }

  try {
    const bodyPayload = (await request.json()) as {
      body?: string
      content?: string
      is_rich_text?: boolean
      isRichText?: boolean
    }
    const body = typeof bodyPayload.body === "string" ? bodyPayload.body.trim() : String(bodyPayload.content ?? "").trim()
    if (!body) {
      return routeError("Body is required", { status: 400 })
    }

    const isRichText = bodyPayload.is_rich_text === true || bodyPayload.isRichText === true
    const formattingError = validateCommentBodyFormatting(body, isRichText)
    if (formattingError) {
      return routeError(formattingError, { status: 400 })
    }

    const result = await updateCommentBodyService(supabase!, {
      id: commentId,
      userId: session!.user.id,
      body,
    })

    revalidateByTag(result.cacheTag)
    return routeData(result.comment)
  } catch (error) {
    const message = messageFromError(error, "Failed to update comment")
    const status = message === "Unauthorized" ? 403 : message === "Comment not found" ? 404 : 500
    return routeError(message, { status })
  }
})

export const DELETE = USER_ROUTE(async ({ supabase, session }, context) => {
  const params = await context.params
  const commentId = extractCommentId(params)

  if (!commentId) {
    return routeError("Comment ID is required", { status: 400 })
  }

  try {
    const result = await applyCommentActionService(supabase!, {
      id: commentId,
      action: "delete",
      userId: session!.user.id,
    })

    revalidateByTag(result.cacheTag)
    return routeData({ success: true })
  } catch (error) {
    const message = messageFromError(error, "Failed to delete comment")
    const status = message === "You can only delete your own comments" ? 403 : message === "Comment not found" ? 404 : 500
    return routeError(message, { status })
  }
})
