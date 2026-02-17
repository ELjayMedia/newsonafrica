import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { applyCommentActionService, updateCommentBodyService } from "@/lib/comments/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type CommentRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

const messageFromError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

function serviceUnavailable(request: NextRequest) {
  return jsonWithCors(request, { error: "Supabase service unavailable" }, { status: 503 })
}

export async function PATCH(request: NextRequest, context: CommentRouteContext) {
  logRequest(request)
  const params = await context.params
  const rawCommentId = params?.id
  const commentId = Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId

  if (!commentId) {
    return jsonWithCors(request, { error: "Comment ID is required" }, { status: 400 })
  }

  let applyCookies = <T extends NextResponse>(response: T): T => response

  try {
    const routeClient = createSupabaseRouteClient(request)
    if (!routeClient) return serviceUnavailable(request)

    applyCookies = routeClient.applyCookies
    const { supabase } = routeClient
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return applyCookies(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const bodyPayload = (await request.json()) as { body?: string; content?: string }
    const body = typeof bodyPayload.body === "string" ? bodyPayload.body.trim() : String(bodyPayload.content ?? "").trim()
    if (!body) {
      return applyCookies(jsonWithCors(request, { error: "Body is required" }, { status: 400 }))
    }

    const result = await updateCommentBodyService(supabase, {
      id: commentId,
      userId: session.user.id,
      body,
    })

    revalidateByTag(result.cacheTag)
    return applyCookies(NextResponse.json(result.comment))
  } catch (error) {
    const message = messageFromError(error, "Failed to update comment")
    const status = message === "Unauthorized" ? 403 : message === "Comment not found" ? 404 : 500
    return applyCookies(jsonWithCors(request, { error: message }, { status }))
  }
}

export async function DELETE(request: NextRequest, context: CommentRouteContext) {
  logRequest(request)
  const params = await context.params
  const rawCommentId = params?.id
  const commentId = Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId

  if (!commentId) {
    return jsonWithCors(request, { error: "Comment ID is required" }, { status: 400 })
  }

  let applyCookies = <T extends NextResponse>(response: T): T => response

  try {
    const routeClient = createSupabaseRouteClient(request)
    if (!routeClient) return serviceUnavailable(request)

    applyCookies = routeClient.applyCookies
    const { supabase } = routeClient
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return applyCookies(jsonWithCors(request, { error: "Unauthorized" }, { status: 401 }))
    }

    const result = await applyCommentActionService(supabase, {
      id: commentId,
      action: "delete",
      userId: session.user.id,
    })

    revalidateByTag(result.cacheTag)
    return applyCookies(NextResponse.json({ success: true }))
  } catch (error) {
    const message = messageFromError(error, "Failed to delete comment")
    const status = message === "You can only delete your own comments" ? 403 : message === "Comment not found" ? 404 : 500
    return applyCookies(jsonWithCors(request, { error: message }, { status }))
  }
}
