import { NextResponse, type NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { sendToMetricsSink } from "@/lib/metrics/sink"
import type {
  CacheMetricPayload,
  MetricsContext,
  MetricsEnvelope,
  MetricsEventPayload,
  WebVitalsMetricPayload,
} from "@/types/metrics"

export const runtime = "edge"

type NormalizedPayload = {
  payload: MetricsEventPayload
  forwardedFor?: string
  userAgent?: string
}

function badRequest(request: NextRequest, message: string) {
  return jsonWithCors(request, { error: message }, { status: 400 })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readOptionalRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key]
  return isRecord(value) ? value : undefined
}

function normalizeForwardedFor(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor?.trim()) return forwardedFor

  const realIp = request.headers.get("x-real-ip")
  if (realIp?.trim()) return realIp

  return undefined
}

function normalizeCachePayload(data: Record<string, unknown>): CacheMetricPayload | null {
  const cacheKey = readOptionalString(data, "cacheKey")
  const status = readOptionalString(data, "status")

  if (!cacheKey || (status !== "hit" && status !== "miss")) {
    return null
  }

  return {
    event: "cache",
    cacheKey,
    status,
    ...(readOptionalString(data, "cacheName") ? { cacheName: readOptionalString(data, "cacheName") } : {}),
    ...(readOptionalRecord(data, "metadata") ? { metadata: readOptionalRecord(data, "metadata") } : {}),
  }
}

function normalizeWebVitalsPayload(data: Record<string, unknown>): WebVitalsMetricPayload | null {
  const id = readOptionalString(data, "id")
  const name = readOptionalString(data, "name")
  const value = readOptionalNumber(data, "value")
  const rating = readOptionalString(data, "rating")

  if (!id || !name || value == null || (rating !== "good" && rating !== "needs-improvement" && rating !== "poor")) {
    return null
  }

  return {
    event: "web-vitals",
    id,
    name,
    value,
    rating,
    ...(readOptionalNumber(data, "delta") != null ? { delta: readOptionalNumber(data, "delta") } : {}),
    ...(readOptionalString(data, "navigationType") ? { navigationType: readOptionalString(data, "navigationType") } : {}),
    ...(readOptionalString(data, "page") ? { page: readOptionalString(data, "page") } : {}),
    ...(readOptionalString(data, "href") ? { href: readOptionalString(data, "href") } : {}),
  }
}

function normalizePayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const event = typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : ""
  const payload = event === "cache" ? normalizeCachePayload(data) : event === "web-vitals" ? normalizeWebVitalsPayload(data) : null

  if (!payload) return null

  const userAgent = request.headers.get("user-agent") ?? undefined
  const forwardedFor = normalizeForwardedFor(request)

  return {
    payload,
    ...(userAgent ? { userAgent } : {}),
    ...(forwardedFor ? { forwardedFor } : {}),
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

  const metricsContext: MetricsContext = {
    source: "client",
    ...(normalized.userAgent ? { userAgent: normalized.userAgent } : {}),
    ...(normalized.forwardedFor ? { forwardedFor: normalized.forwardedFor } : {}),
  }

  try {
    const envelope: MetricsEnvelope = await sendToMetricsSink(normalized.payload, metricsContext)

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
