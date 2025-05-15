import { NextResponse } from "next/server"
import { createRecommendedIndexes, getTableIndexes, analyzeTables } from "@/lib/db-index-manager"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get("table")

    if (!table) {
      return NextResponse.json({ error: "Table parameter is required" }, { status: 400 })
    }

    const indexes = await getTableIndexes(table)
    return NextResponse.json({ indexes })
  } catch (error) {
    console.error("Error fetching indexes:", error)
    return NextResponse.json({ error: "Failed to fetch indexes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    if (action === "create_recommended") {
      const success = await createRecommendedIndexes()
      return NextResponse.json({ success })
    } else if (action === "analyze_tables") {
      const tables = ["profiles", "comments", "comment_reactions", "notifications", "bookmarks"]
      const success = await analyzeTables(tables)
      return NextResponse.json({ success })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error managing indexes:", error)
    return NextResponse.json({ error: "Failed to manage indexes" }, { status: 500 })
  }
}
