import { NextResponse, type NextRequest } from "next/server"
import { EDITION_CODES } from "@/lib/wordpress/editions-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const getSecret = () =>
  process.env.CRON_SECRET?.trim() || process.env.CONTENT_SYNC_SECRET?.trim() || ""

const readBearerToken = (request: NextRequest) => {
  const auth = request.headers.get("authorization")?.trim() ?? ""
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
}

type EditionResult = {
  edition: string
  synced: number
  fetched: number
  hasMore: boolean
  status: "completed" | "failed" | "skipped"
  error?: string
}

export async function GET(request: NextRequest) {
  const secret = getSecret()

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  }

  if (readBearerToken(request) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? ""
  const syncSecret =
    process.env.CONTENT_SYNC_SECRET?.trim() ||
    process.env.REVALIDATION_SECRET?.trim() ||
    secret

  const results: EditionResult[] = []

  for (const edition of EDITION_CODES) {
    try {
      const res = await fetch(`${baseUrl}/api/admin/content-sync/backfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-content-sync-secret": syncSecret,
        },
        body: JSON.stringify({ country: edition, limit: 100 }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        results.push({ edition, synced: 0, fetched: 0, hasMore: false, status: "failed", error: text })
        continue
      }

      const data = (await res.json()) as {
        synced?: number
        fetched?: number
        hasMore?: boolean
        status?: string
        error?: string
      }

      results.push({
        edition,
        synced: data.synced ?? 0,
        fetched: data.fetched ?? 0,
        hasMore: data.hasMore ?? false,
        status: data.status === "completed" ? "completed" : "failed",
        error: data.error,
      })
    } catch (err) {
      results.push({
        edition,
        synced: 0,
        fetched: 0,
        hasMore: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const allOk = results.every((r) => r.status === "completed")

  return NextResponse.json(
    { ok: allOk, ranAt: new Date().toISOString(), results },
    { status: allOk ? 200 : 207 },
  )
}
