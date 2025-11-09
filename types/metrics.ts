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

export type MetricsEventPayload = WebVitalsMetricPayload | CacheMetricPayload

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
