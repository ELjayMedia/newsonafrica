import { NextResponse } from "next/server"
import algoliasearch from "algoliasearch"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Authentication check
    const supabase = createClient(cookies())
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    const { data: user } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Initialize Algolia client with admin API key
    const client = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
      process.env.ALGOLIA_ADMIN_API_KEY || "", // Use admin key, not search key
    )

    const index = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "")

    // Reindex logic here...

    return NextResponse.json({ success: true, message: "Reindexing started" })
  } catch (error) {
    console.error("Algolia reindex error:", error)
    return NextResponse.json(
      {
        error: "Reindexing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
