const METRICS_ENDPOINT = "/api/metrics"

type WebVitalsMetric = {
  id: string
  name: string
  value: number
  delta?: number
  entries?: unknown
  rating?: "good" | "needs-improvement" | "poor"
  startTime?: number
  navigationType?: string
  label?: string
}

type WebVitalsPayload = {
  event: "web-vitals"
  id: string
  name: string
  value: number
  delta?: number
  entries?: unknown
  rating?: "good" | "needs-improvement" | "poor"
  startTime?: number
  navigationType?: string
  label?: string
  page?: string
  href?: string
}

function buildPayload(metric: WebVitalsMetric): WebVitalsPayload {
  const { id, name, value, delta, entries, rating, startTime, navigationType, label } = metric
  const location = typeof window !== "undefined" ? window.location : undefined

  return {
    event: "web-vitals",
    id,
    name,
    value,
    ...(delta != null ? { delta } : {}),
    ...(entries ? { entries } : {}),
    ...(rating ? { rating } : {}),
    ...(startTime != null ? { startTime } : {}),
    ...(navigationType ? { navigationType } : {}),
    ...(label ? { label } : {}),
    ...(location?.pathname ? { page: location.pathname } : {}),
    ...(location?.href ? { href: location.href } : {}),
  }
}

function sendMetric(payload: WebVitalsPayload) {
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

export function reportWebVitals(metric: WebVitalsMetric) {
  try {
    const payload = buildPayload(metric)
    sendMetric(payload)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to build web vitals payload", error)
    }
  }
}
