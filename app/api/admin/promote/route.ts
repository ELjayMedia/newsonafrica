import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
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

    // Get the email of the user to promote from request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Call the function to make a user an admin
    const { error } = await supabase.rpc("make_user_admin", { user_email: email })

    if (error) {
      console.error("Error promoting user to admin:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} has been promoted to admin`,
    })
  } catch (error: any) {
    console.error("Error in promote admin route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
