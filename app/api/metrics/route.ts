import { NextResponse, type NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { sendToMetricsSink } from "@/lib/metrics/sink"
import type { CacheMetricPayload, MetricsEventPayload, MetricsEnvelope, WebVitalsMetricPayload } from "@/types/metrics"

export const runtime = "edge"

type AcceptedEvent = MetricsEventPayload["event"]

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

function isAcceptedEvent(value: unknown): value is AcceptedEvent {
  return value === "web-vitals" || value === "cache"
}

function isWebVitalLabel(value: unknown): value is WebVitalsMetricPayload["label"] {
  return value === "web-vital" || value === "custom"
}

function isWebVitalName(value: unknown): value is WebVitalsMetricPayload["name"] {
  return typeof value === "string"
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
  const metadata = isRecord(data.metadata) ? data.metadata : undefined

  return {
    event: "cache",
    cacheKey,
    status,
    ...(cacheName ? { cacheName } : {}),
    ...(metadata ? { metadata } : {}),
  }
}

function normalizeWebVitalsPayload(data: Record<string, unknown>): WebVitalsMetricPayload | null {
  const id = typeof data.id === "string" ? data.id : undefined
  const startTime = typeof data.startTime === "number" ? data.startTime : undefined
  const value = typeof data.value === "number" ? data.value : undefined
  const label = isWebVitalLabel(data.label) ? data.label : undefined
  const name = isWebVitalName(data.name) ? data.name : undefined

  if (!id || typeof startTime !== "number" || typeof value !== "number" || !label || !name) {
    return null
  }

  const attribution = isRecord(data.attribution) ? data.attribution : undefined

  return {
    event: "web-vitals",
    id,
    startTime,
    value,
    label,
    name,
    ...(attribution ? { attribution } : {}),
    ...(typeof data.page === "string" ? { page: data.page } : {}),
    ...(typeof data.href === "string" ? { href: data.href } : {}),
  }
}

function normalizePayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const rawEvent = typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : null

  if (!isAcceptedEvent(rawEvent)) return null

  if (rawEvent === "web-vitals") {
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

  const userAgent = normalized.userAgent
  const forwardedFor = normalized.forwardedFor
  const eventPayload: MetricsEventPayload =
    normalized.event === "web-vitals"
      ? {
          event: normalized.event,
          id: normalized.id,
          startTime: normalized.startTime,
          value: normalized.value,
          label: normalized.label,
          name: normalized.name,
          ...(normalized.attribution ? { attribution: normalized.attribution } : {}),
          ...(normalized.page ? { page: normalized.page } : {}),
          ...(normalized.href ? { href: normalized.href } : {}),
        }
      : {
          event: normalized.event,
          cacheKey: normalized.cacheKey,
          status: normalized.status,
          ...(normalized.cacheName ? { cacheName: normalized.cacheName } : {}),
          ...(normalized.metadata ? { metadata: normalized.metadata } : {}),
        }

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
