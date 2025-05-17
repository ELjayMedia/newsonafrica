import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get("authorization")
    if (!authHeader || authHeader !== `Bearer ${process.env.REVALIDATION_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get SQL migration
    const sqlPath = path.join(process.cwd(), "utils", "supabase", "remove-algolia-tables.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Execute SQL
    const supabase = createClient(cookies())
    const { error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: "Failed to execute SQL" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Algolia tables removed successfully" })
  } catch (error) {
    console.error("Error in cleanup-algolia-tables:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
