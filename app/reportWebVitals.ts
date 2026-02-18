import type { NextWebVitalsMetric } from "next/app"

const METRICS_ENDPOINT = "/api/metrics"

type MetricExtras = {
  delta?: number
  entries?: unknown
  rating?: string
  startTime?: number
  navigationType?: string
  label?: string
}

function buildPayload(metric: NextWebVitalsMetric) {
  // Next's type is stricter in some versions; treat these fields as optional extras.
  const m = metric as NextWebVitalsMetric & MetricExtras

  const { id, name, value } = m
  const location = typeof window !== "undefined" ? window.location : undefined

  return {
    event: "web-vitals" as const,
    id,
    name,
    label: m.label,
    value,
    delta: m.delta,
    entries: m.entries,
    rating: m.rating,
    startTime: m.startTime,
    navigationType: m.navigationType,
    page: location?.pathname,
    href: location?.href,
  }
}

function sendMetric(payload: ReturnType<typeof buildPayload>) {
  const body = JSON.stringify(payload)

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon(METRICS_ENDPOINT, blob)
    return
  }

  void fetch(METRICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to report web vitals", error)
    }
  })
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  try {
    const payload = buildPayload(metric)
    sendMetric(payload)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to build web vitals payload", error)
    }
  }
}
