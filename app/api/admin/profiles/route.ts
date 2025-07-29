import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { successResponse, handleApiError } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.app_metadata?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const admin = createAdminClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await admin
      .from("profiles")
      .select("*", { count: "exact" })
      .range(from, to)

    if (error) throw error

    return successResponse(data, {
      page,
      limit,
      totalCount: count,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

