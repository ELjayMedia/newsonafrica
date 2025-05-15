import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { applyPendingMigrations, getMigrationStatus, createExecSqlFunction } from "@/lib/db-migrations"

// GET: Get migration status
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get migration status
    const status = await getMigrationStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting migration status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// POST: Apply pending migrations
export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Create exec_sql function if it doesn't exist
    await createExecSqlFunction()

    // Apply pending migrations
    const results = await applyPendingMigrations(session.user.id)

    // Get updated migration status
    const status = await getMigrationStatus()

    return NextResponse.json({
      results,
      status,
    })
  } catch (error) {
    console.error("Error applying migrations:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
