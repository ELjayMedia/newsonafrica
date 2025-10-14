import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { applyRateLimit, handleApiError, jsonWithCors as withCors, logRequest, successResponse } from "@/lib/api-utils"
import { createSupabaseRouteClient } from "@/utils/supabase/route-client"

export const runtime = "nodejs"

// Cache policy: very short
export const revalidate = 30

const moderationQuerySchema = z.object({
  status: z.enum(["pending", "flagged", "deleted", "active"]).default("pending"),
  limit: z.coerce.number().int().positive().max(200).default(100),
})

async function ensureModerator(supabase: ReturnType<typeof createSupabaseRouteClient>, userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to verify permissions: ${error.message}`)
  }

  return Boolean(profile?.is_admin)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  logRequest(request)

  try {
    const rateLimitResponse = await applyRateLimit(request, 20, "COMMENTS_MODERATION_API_CACHE_TOKEN")
    if (rateLimitResponse) return withCors(request, rateLimitResponse)

    const supabase = createSupabaseRouteClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`)
    }

    if (!session?.user) {
      return withCors(request, handleApiError(new Error("Unauthorized")))
    }

    const isModerator = await ensureModerator(supabase, session.user.id)

    if (!isModerator) {
      return withCors(request, handleApiError(new Error("Forbidden")))
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { status, limit } = moderationQuerySchema.parse(params)

    const { data: comments, error } = await supabase
      .from("comments")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch moderation comments: ${error.message}`)
    }

    return withCors(
      request,
      successResponse(
        { comments: comments ?? [] },
        {
          metadata: {
            status,
            count: comments?.length ?? 0,
          },
        },
      ),
    )
  } catch (error) {
    return withCors(request, handleApiError(error))
  }
}
