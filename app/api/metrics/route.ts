import { NextResponse, type NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { sendToMetricsSink } from "@/lib/metrics/sink"
import type { CacheMetricPayload, MetricsEventPayload, MetricsEnvelope } from "@/types/metrics"

export const runtime = "edge"

const ACCEPTED_EVENTS = new Set(["web-vitals", "cache"] as const)

type NormalizedPayload = MetricsEventPayload & {
  forwardedFor?: string
  userAgent?: string
}

function badRequest(request: NextRequest, message: string) {
  return jsonWithCors(request, { error: message }, { status: 400 })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeCachePayload(data: Record<string, unknown>): CacheMetricPayload | null {
  const cacheKey = typeof data.cacheKey === "string" ? data.cacheKey : undefined
  const status = data.status === "hit" || data.status === "miss" ? data.status : undefined

  if (!cacheKey || !status) return null

  const cacheName = typeof data.cacheName === "string" ? data.cacheName : undefined
  const metadata = isRecord(data.metadata) ? (data.metadata as Record<string, unknown>) : undefined

  return {
    event: "cache",
    cacheKey,
    status,
    ...(cacheName ? { cacheName } : {}),
    ...(metadata ? { metadata } : {}),
  }
}

function normalizePayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const event =
    typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : null

  if (!event || !ACCEPTED_EVENTS.has(event as any)) return null

  if (event === "web-vitals") {
    const name = typeof data.name === "string" ? data.name : undefined
    const value = typeof data.value === "number" ? data.value : undefined
    const id = typeof data.id === "string" ? data.id : undefined

    if (!name || typeof value !== "number" || !id) return null

    const base: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(data)) {
      base[key] = val
    }

    return {
      ...(base as MetricsEventPayload),
      event: "web-vitals",
      page: typeof data.page === "string" ? data.page : undefined,
      href: typeof data.href === "string" ? data.href : undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
      forwardedFor: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
    }
  }

  const cachePayload = normalizeCachePayload(data)
  if (!cachePayload) return null

  return {
    ...cachePayload,
    userAgent: request.headers.get("user-agent") ?? undefined,
    forwardedFor: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
  }
}

export async function POST(request: NextRequest) {
  logRequest(request)

  let data: unknown
  try {
    data = await request.json()
  } catch (error) {
    console.warn("metrics endpoint received invalid JSON", error)
    return badRequest(request, "Invalid JSON payload")
  }

  const normalized = normalizePayload(request, data)
  if (!normalized) {
    return badRequest(request, "Unsupported metrics payload")
  }

  const { userAgent, forwardedFor, ...rest } = normalized
  const eventPayload = rest as MetricsEventPayload

  try {
    const envelope: MetricsEnvelope = await sendToMetricsSink(eventPayload, {
      source: "client",
      userAgent,
      forwardedFor,
    })

    return jsonWithCors(request, { ok: true, received: envelope.event }, { status: 202 })
  } catch (error) {
    console.error("Failed to persist metrics", error)
    return jsonWithCors(request, { error: "Failed to persist metrics" }, { status: 500 })
  }
}

export function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 204 })
  response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "*")
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return response
}
