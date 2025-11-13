import { revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import {
  AFRICAN_EDITION,
  SUPPORTED_EDITIONS,
  type SupportedEdition,
} from "@/lib/editions"
import {
  buildHomeContentPropsForEditionUncached,
  buildHomeContentPropsUncached,
} from "@/lib/home-builder"
import {
  readHomeSnapshot,
  writeHomeSnapshot,
  type HomeSnapshotRecord,
} from "@/lib/home-snapshot"
import { sendToMetricsSink } from "@/lib/metrics/sink"
import { getSiteBaseUrl } from "@/lib/site-url"
import type { MetricsEventPayload } from "@/types/metrics"

export const runtime = "nodejs"
export const revalidate = 0

interface EditionResult {
  edition: string
  durationMs: number
  ttfbDeltaMs?: number | null
  status: "success" | "error"
  error?: string
}

const SNAPSHOT_TTL_SECONDS = CACHE_DURATIONS.VERY_LONG

function isAfricanEditionCode(edition: SupportedEdition): boolean {
  return edition.code === AFRICAN_EDITION.code
}

async function buildEditionSnapshot(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<{ record: HomeSnapshotRecord; durationMs: number }> {
  const startedAt = Date.now()
  const data = isAfricanEditionCode(edition)
    ? await buildHomeContentPropsUncached(baseUrl)
    : await buildHomeContentPropsForEditionUncached(baseUrl, edition)
  const durationMs = Date.now() - startedAt

  const record: HomeSnapshotRecord = {
    edition: edition.code,
    data,
    metadata: {
      builtAt: new Date().toISOString(),
      buildDurationMs: durationMs,
      ttfbMs: durationMs,
      source: "rebuild",
    },
  }

  await writeHomeSnapshot(edition.code, record, { ttlSeconds: SNAPSHOT_TTL_SECONDS })

  return { record, durationMs }
}

async function emitMetrics(results: EditionResult[]): Promise<void> {
  await Promise.all(
    results.map((result) => {
      const payload: MetricsEventPayload = {
        event: "home-rebuild",
        edition: result.edition,
        durationMs: result.durationMs,
        status: result.status,
        ...(typeof result.ttfbDeltaMs === "number" ? { ttfbDeltaMs: result.ttfbDeltaMs } : {}),
        ...(result.error ? { errorMessage: result.error } : {}),
      }

      return sendToMetricsSink(payload, { source: "server" })
    }),
  )
}

async function handleRebuild(request: NextRequest) {
  const baseUrl = getSiteBaseUrl()
  const editions = SUPPORTED_EDITIONS
  const results: EditionResult[] = []

  for (const edition of editions) {
    const iterationStart = Date.now()
    const previous = await readHomeSnapshot(edition.code)

    try {
      const { record, durationMs } = await buildEditionSnapshot(baseUrl, edition)
      const previousTtfb = previous?.metadata?.ttfbMs
      const currentTtfb = record.metadata.ttfbMs ?? null
      const ttfbDelta =
        typeof previousTtfb === "number" && typeof currentTtfb === "number"
          ? currentTtfb - previousTtfb
          : null

      results.push({
        edition: edition.code,
        durationMs,
        ttfbDeltaMs: ttfbDelta,
        status: "success",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown rebuild error"
      console.error(`Failed to rebuild home snapshot for ${edition.code}`, { error })
      results.push({
        edition: edition.code,
        durationMs: Date.now() - iterationStart,
        status: "error",
        error: errorMessage,
      })
    }
  }

  const hasFailure = results.some((result) => result.status === "error")

  await emitMetrics(results)

  if (!hasFailure) {
    await revalidateTag("home")
  }

  const status = hasFailure ? 500 : 200
  const body = hasFailure
    ? { ok: false, error: "Failed to rebuild one or more home snapshots", results }
    : { ok: true, results }

  return jsonWithCors(request, body, { status })
}

export async function POST(request: NextRequest) {
  logRequest(request)
  return handleRebuild(request)
}

export async function GET(request: NextRequest) {
  logRequest(request)
  return handleRebuild(request)
}

export function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 204 })
  response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "*")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}
