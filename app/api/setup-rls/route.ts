import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check if the user is authenticated and has admin privileges
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // This endpoint should only be accessible to admins in production
    // For demo purposes, we're allowing the authenticated user to run it

    // Enable RLS on the bookmarks table
    const { error: enableRlsError } = await supabase.rpc("enable_rls", {
      table_name: "bookmarks",
    })

    if (enableRlsError) {
      console.error("Error enabling RLS:", enableRlsError)
      return NextResponse.json({ error: "Failed to enable RLS" }, { status: 500 })
    }

    // Create RLS policies for the bookmarks table
    const { error: createPoliciesError } = await supabase.rpc("setup_bookmark_policies")

    if (createPoliciesError) {
      console.error("Error creating policies:", createPoliciesError)
      return NextResponse.json({ error: "Failed to create policies" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "RLS policies set up successfully" })
  } catch (error) {
    console.error("Error setting up RLS:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
