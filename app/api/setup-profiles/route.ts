import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

// Only allow this endpoint in development
const isDevelopment = process.env.NODE_ENV === "development"

export async function GET(request: Request) {
  if (!isDevelopment) {
    return NextResponse.json({ error: "This endpoint is only available in development mode" }, { status: 403 })
  }

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

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "utils", "supabase", "setup-profiles.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql: sqlContent })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Make the current user an admin
    const { error: updateError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", session.user.id)

    if (updateError) {
      console.error("Error making user admin:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Profiles table set up successfully and you are now an admin",
    })
  } catch (error: any) {
    console.error("Error in setup-profiles route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
