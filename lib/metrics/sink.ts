import type { MetricsContext, MetricsEnvelope, MetricsEventPayload } from "@/types/metrics"

const METRICS_FORWARD_URL = process.env.METRICS_FORWARD_URL || process.env.METRICS_WEBHOOK_URL

function createEnvelope(
  payload: MetricsEventPayload,
  context?: MetricsContext,
): MetricsEnvelope {
  return {
    ...payload,
    timestamp: new Date().toISOString(),
    ...(context?.source ? { source: context.source } : {}),
    ...(context?.userAgent ? { userAgent: context.userAgent } : {}),
    ...(context?.forwardedFor ? { forwardedFor: context.forwardedFor } : {}),
  }
}

async function forwardMetrics(envelope: MetricsEnvelope) {
  if (!METRICS_FORWARD_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[metrics]", envelope)
    }
    return
  }

  const response = await fetch(METRICS_FORWARD_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(envelope),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Failed to forward metrics: ${response.status} ${error}`)
  }
}

export async function sendToMetricsSink(
  payload: MetricsEventPayload,
  context?: MetricsContext,
): Promise<MetricsEnvelope> {
  const envelope = createEnvelope(payload, context)
  await forwardMetrics(envelope)
  return envelope
}

export { createEnvelope }
