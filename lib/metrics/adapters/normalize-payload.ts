import type { NextRequest } from "next/server"

import type { CacheMetricPayload, MetricsEventPayload } from "@/types/metrics"

type NormalizedPayload = MetricsEventPayload & {
  forwardedFor?: string
  userAgent?: string
}

const ACCEPTED_EVENTS = new Set(["web-vitals", "cache"] as const)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

function normalizeWebVitalsPayload(data: Record<string, unknown>): MetricsEventPayload | null {
  const id = typeof data.id === "string" ? data.id : undefined
  const startTime = typeof data.startTime === "number" ? data.startTime : undefined
  const value = typeof data.value === "number" ? data.value : undefined
  const label = data.label === "web-vital" || data.label === "custom" ? data.label : undefined
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
    label: label as MetricsEventPayload extends infer _T ? never : never,
    name: name as MetricsEventPayload extends infer _T ? never : never,
    ...(attribution ? { attribution } : {}),
    ...(typeof data.page === "string" ? { page: data.page } : {}),
    ...(typeof data.href === "string" ? { href: data.href } : {}),
  } as MetricsEventPayload
}

export function normalizeMetricsPayload(request: NextRequest, data: unknown): NormalizedPayload | null {
  if (!isRecord(data)) return null

  const event = typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : null
  if (!event || !ACCEPTED_EVENTS.has(event as "web-vitals" | "cache")) return null

  const payload = event === "web-vitals" ? normalizeWebVitalsPayload(data) : normalizeCachePayload(data)
  if (!payload) return null

  return {
    ...payload,
    userAgent: request.headers.get("user-agent") ?? undefined,
    forwardedFor: normalizeForwardedFor(request),
  }
}
