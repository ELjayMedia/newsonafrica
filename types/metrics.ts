import type { NextWebVitalsMetric } from "next/app"

type MetricSource = "client" | "server"

export type WebVitalsMetricPayload = NextWebVitalsMetric & {
  event: "web-vitals"
  page?: string
  href?: string
}

export type CacheMetricPayload = {
  event: "cache"
  cacheKey: string
  status: "hit" | "miss"
  cacheName?: string
  metadata?: Record<string, unknown>
}

export type HomeRebuildMetricPayload = {
  event: "home-rebuild"
  edition: string
  durationMs: number
  status: "success" | "error"
  ttfbDeltaMs?: number | null
  errorMessage?: string
}

export type MetricsEventPayload =
  | WebVitalsMetricPayload
  | CacheMetricPayload
  | HomeRebuildMetricPayload

export type MetricsEnvelope = MetricsEventPayload & {
  timestamp: string
  source?: MetricSource
  userAgent?: string
  forwardedFor?: string
}

export type MetricsContext = {
  source?: MetricSource
  userAgent?: string
  forwardedFor?: string
}
