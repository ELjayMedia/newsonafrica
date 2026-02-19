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

function normalizeForwardedFor(request: NextRequest): string | undefined {
  // Most reliable on Vercel/CF/etc
  const xf = request.headers.get("x-forwarded-for")
  if (xf && xf.trim()) return xf

  // Common alternative used by reverse proxies
  const xr = request.headers.get("x-real-ip")
  if (xr && xr.trim()) return xr

  // No IP available in this runtime/request type
  return undefined
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

function normalizeWebVitalsPayload(data: Record<string, unknown>): MetricsEventPayload | null {
  // These three are required by your MetricsEventPayload union (per the error output)
  const id = typeof data.id === "string" ? data.id : undefined
  const startTime = typeof data.startTime === "number" ? data.startTime : undefined
  const value = typeof data.value === "number" ? data.value : undefined

  // These are also expected
  const label = data.label === "web-vital" || data.label === "custom" ? data.label : undefined
  const name = typeof data.name === "string" ? data.name : undefined

  if (!id || typeof startTime !== "number" || typeof value !== "number" || !label || !name) {
    return null
  }

  const attribution = isRecord(data.attribution) ? (data.attribution as Record<string, unknown>) : undefined

  // IMPORTANT: build a minimal object — do NOT spread the whole input record
  return {
    event: "web-vitals",
    id,
    startTime,
    value,
    label: label as any,
    name: name as any,
    ...(attribution ? { attribution } : {}),
    ...(typeof data.page === "string" ? { page: data.page } : {}),
    ...(typeof data.href === "string" ? { href: data.href } : {}),
  } as MetricsEventPayload
}

function normalizePayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const event =
    typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : null

  if (!event || !ACCEPTED_EVENTS.has(event as any)) return null

  if (event === "web-vitals") {
    const payload = normalizeWebVitalsPayload(data)
    if (!payload) return null

    return {
      ...payload,
      userAgent: request.headers.get("user-agent") ?? undefined,
      forwardedFor: normalizeForwardedFor(request),
    }
  }

  const cachePayload = normalizeCachePayload(data)
  if (!cachePayload) return null

  return {
    ...cachePayload,
    userAgent: request.headers.get("user-agent") ?? undefined,
    forwardedFor: normalizeForwardedFor(request),
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
