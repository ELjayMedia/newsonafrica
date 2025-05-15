import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    // Check if user is authenticated and is an admin
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an admin (you would need to implement this check)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "utils", "supabase", "setup-notifications.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql: sqlContent })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in setup-notifications route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
