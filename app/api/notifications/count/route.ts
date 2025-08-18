import logger from "@/utils/logger";
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ count: 0 }, { status: 401 })
    }

    // Get unread notification count from Supabase
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("read", false)

    if (error) {
      logger.error("Error fetching notification count:", error)
      return NextResponse.json({ count: 0 }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    logger.error("Error in notification count route:", error)
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}
