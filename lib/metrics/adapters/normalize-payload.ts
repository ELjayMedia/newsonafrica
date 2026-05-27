import type { NextRequest } from "next/server"

import type { CacheMetricPayload, MetricsEventPayload, WebVitalsMetricPayload } from "@/types/metrics"

type NormalizedPayload = MetricsEventPayload & {
  forwardedFor?: string
  userAgent?: string
}

type AcceptedEvent = MetricsEventPayload["event"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAcceptedEvent(value: unknown): value is AcceptedEvent {
  return value === "web-vitals" || value === "cache"
}

function isWebVitalLabel(value: unknown): value is WebVitalsMetricPayload["label"] {
  return value === "web-vital" || value === "custom"
}

function normalizeForwardedFor(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor && forwardedFor.trim()) return forwardedFor

  const realIp = request.headers.get("x-real-ip")
  if (realIp && realIp.trim()) return realIp

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
  const name = typeof data.name === "string" ? data.name : undefined

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

export function normalizeMetricsPayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const event = typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : null
  if (!isAcceptedEvent(event)) return null

  const payload = event === "web-vitals" ? normalizeWebVitalsPayload(data) : normalizeCachePayload(data)
  if (!payload) return null

  return {
    ...payload,
    userAgent: request.headers.get("user-agent") ?? undefined,
    forwardedFor: normalizeForwardedFor(request),
  }
}
