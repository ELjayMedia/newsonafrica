import { NextResponse, type NextRequest } from "next/server"

import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { normalizeMetricsPayload } from "@/lib/metrics/adapters/normalize-payload"
import { sendToMetricsSink } from "@/lib/metrics/sink"
import type { MetricsEnvelope, MetricsEventPayload } from "@/types/metrics"

export const runtime = "edge"

function badRequest(request: NextRequest, message: string) {
  return jsonWithCors(request, { error: message }, { status: 400 })
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

  const normalized = normalizeMetricsPayload(request, data)
  if (!normalized) {
    return badRequest(request, "Unsupported metrics payload")
  }

  const { userAgent, forwardedFor, ...eventPayload } = normalized

  try {
    const envelope: MetricsEnvelope = await sendToMetricsSink(eventPayload as MetricsEventPayload, {
      source: "client",
      userAgent,
      forwardedFor,
    })

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
