type MetricSource = "client" | "server"

export type WebVitalsMetricPayload = {
  event: "web-vitals"
  id: string
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta?: number
  navigationType?: string
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
