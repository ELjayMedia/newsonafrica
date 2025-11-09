import type { NextWebVitalsMetric } from "next/app"

const METRICS_ENDPOINT = "/api/metrics"

function buildPayload(metric: NextWebVitalsMetric) {
  const { id, name, label, value, delta, entries, rating, startTime, navigationType } = metric
  const location = typeof window !== "undefined" ? window.location : undefined

  return {
    event: "web-vitals" as const,
    id,
    name,
    label,
    value,
    delta,
    entries,
    rating,
    startTime,
    navigationType,
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
