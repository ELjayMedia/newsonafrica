import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

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

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "utils/supabase/setup-bookmarks.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      console.error("Error setting up bookmarks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Bookmarks system initialized successfully" })
  } catch (error: any) {
    console.error("Error in setup-bookmarks route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
