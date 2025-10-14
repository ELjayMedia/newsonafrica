import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { fetchFromWp } from "@/lib/wordpress/client"
import { DEFAULT_COUNTRY } from "@/lib/wordpress/shared"
import * as log from "@/lib/log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])

type ProxyRequestBody = {
  endpoint?: string
  method?: string
  params?: Record<string, string | number | string[] | undefined>
  payload?: unknown
  countryCode?: string
  withHeaders?: boolean
  timeout?: number
}

type HeadersResponse = {
  data: unknown
  headers: Headers
}

export async function POST(request: NextRequest) {
  let body: ProxyRequestBody

  try {
    body = (await request.json()) as ProxyRequestBody
  } catch (error) {
    log.error("[wp-proxy] Invalid JSON payload", { error })
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
  }

  const method = (body.method || "GET").toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `Method ${method} is not supported` }, { status: 405 })
  }

  const countryCode = body.countryCode?.trim().toLowerCase() || DEFAULT_COUNTRY
  const normalizedEndpoint = endpoint.replace(/^\/+/, "")

  try {
    const result = await fetchFromWp(
      countryCode,
      {
        endpoint: normalizedEndpoint,
        method,
        params: body.params,
        payload: body.payload,
      },
      {
        auth: true,
        withHeaders: Boolean(body.withHeaders),
        timeout: body.timeout,
        revalidate: false,
      },
    )

    if (result === null) {
      throw new Error("WordPress request returned no data")
    }

    if (body.withHeaders) {
      const { data, headers } = result as HeadersResponse
      const serializedHeaders = Object.fromEntries(headers.entries())
      return NextResponse.json({ data, headers: serializedHeaders })
    }

    return NextResponse.json(result)
  } catch (error) {
    log.error("[wp-proxy] Request failed", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      endpoint: normalizedEndpoint,
      method,
      countryCode,
    })

    return NextResponse.json({ error: "Failed to proxy request to WordPress" }, { status: 502 })
  }
}
