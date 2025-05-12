import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request, { params }: { params: { id: string; action: string } }) {
  const { id, action } = params

  if (!id || !action) {
    return NextResponse.json({ error: "Missing user ID or action" }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get the current user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Get user with their role from the database
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user role:", userError)
    return NextResponse.json({ error: "Failed to verify user permissions" }, { status: 500 })
  }

  // Check if user has admin role
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 })
  }

  try {
    // Handle different actions
    switch (action) {
      case "promote":
        await supabase.from("profiles").update({ role: "admin" }).eq("id", id)

        return NextResponse.json({
          success: true,
          message: "User promoted to admin successfully",
        })

      case "demote":
        // Prevent demoting yourself
        if (id === session.user.id) {
          return NextResponse.json(
            {
              error: "You cannot demote yourself",
            },
            { status: 400 },
          )
        }

        await supabase.from("profiles").update({ role: "user" }).eq("id", id)

        return NextResponse.json({
          success: true,
          message: "User demoted to regular user successfully",
        })

      case "suspend":
        // Prevent suspending yourself
        if (id === session.user.id) {
          return NextResponse.json(
            {
              error: "You cannot suspend yourself",
            },
            { status: 400 },
          )
        }

        await supabase.from("profiles").update({ status: "suspended" }).eq("id", id)

        return NextResponse.json({
          success: true,
          message: "User suspended successfully",
        })

      case "activate":
        await supabase.from("profiles").update({ status: "active" }).eq("id", id)

        return NextResponse.json({
          success: true,
          message: "User activated successfully",
        })

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
          },
          { status: 400 },
        )
    }
  } catch (error: any) {
    console.error(`Error performing action ${action}:`, error)
    return NextResponse.json(
      {
        error: error.message || `Failed to perform ${action}`,
      },
      { status: 500 },
    )
  }
}
