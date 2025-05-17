import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { MigrationService } from "@/services/migration-service"

// GET: Get migration status
export async function GET() {
  try {
    const cookieStore = cookies()
    const migrationService = new MigrationService(cookieStore)

    // Get migration status
    const status = await migrationService.getMigrationStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting migration status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// POST: Apply pending migrations
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const migrationService = new MigrationService(cookieStore)

    // Get user ID from request
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Apply pending migrations
    const results = await migrationService.applyPendingMigrations(userId)

    // Get updated migration status
    const status = await migrationService.getMigrationStatus()

    return NextResponse.json({
      results,
      status,
    })
  } catch (error) {
    console.error("Error applying migrations:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
