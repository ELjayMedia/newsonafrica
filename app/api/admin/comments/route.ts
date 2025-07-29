import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { successResponse, handleApiError } from "@/lib/api-utils"

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "deleted", "flagged"]),
})

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !(user.app_metadata?.roles || []).includes("moderator") && !(user.app_metadata?.roles || []).includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const admin = createAdminClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "flagged"

    const { data, error } = await admin
      .from("comments")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) throw error

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !(user.app_metadata?.roles || []).some((r: string) => ["moderator", "admin"].includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { id, status } = updateSchema.parse(body)

    const admin = createAdminClient(cookieStore)
    const { error } = await admin
      .from("comments")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

