import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const getSyncSecret = () =>
  process.env.CONTENT_SYNC_SECRET?.trim() || process.env.REVALIDATION_SECRET?.trim() || ""

const readAuthToken = (request: NextRequest) => {
  const headerToken = request.headers.get("x-content-sync-secret")?.trim()
  if (headerToken) return headerToken

  const authorization = request.headers.get("authorization")?.trim()
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim()
  }

  return ""
}

export async function GET(request: NextRequest) {
  const expectedSecret = getSyncSecret()

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Content sync secret is not configured" },
      { status: 500 },
    )
  }

  if (readAuthToken(request) !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: cursors, error: cursorError } = await supabase
    .from("content_sync_cursor")
    .select("edition_code, sync_status, last_synced_at, error_message, updated_at")
    .order("edition_code")

  if (cursorError) {
    return NextResponse.json({ error: cursorError.message }, { status: 500 })
  }

  const { data: indexCounts, error: countError } = await supabase
    .from("content_index")
    .select("edition_code")

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  const countByEdition = (indexCounts ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.edition_code] = (acc[row.edition_code] ?? 0) + 1
    return acc
  }, {})

  const editions = (cursors ?? []).map((cursor) => ({
    editionCode: cursor.edition_code,
    syncStatus: cursor.sync_status,
    lastSyncedAt: cursor.last_synced_at,
    errorMessage: cursor.error_message,
    updatedAt: cursor.updated_at,
    indexedCount: countByEdition[cursor.edition_code] ?? 0,
  }))

  const allEditionCodes = Object.keys(countByEdition)
  const knownEditionCodes = new Set((cursors ?? []).map((c) => c.edition_code))
  for (const code of allEditionCodes) {
    if (!knownEditionCodes.has(code)) {
      editions.push({
        editionCode: code,
        syncStatus: null,
        lastSyncedAt: null,
        errorMessage: null,
        updatedAt: null,
        indexedCount: countByEdition[code] ?? 0,
      })
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    editions,
    summary: {
      total: editions.length,
      completed: editions.filter((e) => e.syncStatus === "completed").length,
      running: editions.filter((e) => e.syncStatus === "running").length,
      failed: editions.filter((e) => e.syncStatus === "failed").length,
      neverSynced: editions.filter((e) => !e.syncStatus).length,
      totalIndexed: Object.values(countByEdition).reduce((sum, n) => sum + n, 0),
    },
  })
}
