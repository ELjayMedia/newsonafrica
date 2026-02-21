import { NextResponse, type NextRequest } from "next/server"
import type { Session, SupabaseClient } from "@supabase/supabase-js"

import { REVALIDATION_SECRET } from "@/config/env"
import { applyRateLimit, logRequest, withCors } from "@/lib/api-utils"
import { ActionError } from "@/lib/supabase/action-result"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import type { Database } from "@/types/supabase"
import { ValidationError } from "@/lib/validation"

export type ApiEnvelope<T> = {
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

export type RouteContext = {
  request: NextRequest
  supabase: SupabaseClient<Database> | null
  session: Session | null
  applyCookies: <T extends NextResponse>(res: T) => T
}

export type RouteOptions = {
  rateLimit?: { limit: number; tokenEnv: string }
  auth?: "public" | "user" | "admin"
  useSupabase?: boolean
  applyCookies?: boolean
}

function withCorsNoStore(request: NextRequest, response: NextResponse) {
  const res = withCors(request, response)
  res.headers.set("Cache-Control", "no-store")
  return res
}

export function routeData<T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }) {
  return NextResponse.json<ApiEnvelope<T>>(
    {
      data,
      error: null,
      ...(init?.meta ? { meta: init.meta } : {}),
    },
    init,
  )
}

export function routeError(message: string, init?: ResponseInit & { meta?: Record<string, unknown> }) {
  return NextResponse.json<ApiEnvelope<null>>(
    {
      data: null,
      error: message,
      ...(init?.meta ? { meta: init.meta } : {}),
    },
    init,
  )
}

export function serviceUnavailableResponse(request: NextRequest) {
  return withCorsNoStore(request, routeError("Supabase service unavailable", { status: 503 }))
}

function errorToResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError || (typeof error === "object" && error !== null && "statusCode" in error)) {
    const validationError = error as ValidationError
    const fieldErrors = (validationError.fieldErrors ?? {}) as Record<string, string[]>
    return routeError(validationError.message || "Invalid request", {
      status: typeof validationError.statusCode === "number" ? validationError.statusCode : 400,
      meta: Object.keys(fieldErrors).length > 0 ? { validationErrors: fieldErrors } : undefined,
    })
  }

  if (error instanceof ActionError) {
    return routeError(error.message, { status: error.status ?? 500 })
  }

  if (error instanceof Error) {
    return routeError(process.env.NODE_ENV === "production" ? "An unexpected error occurred" : error.message, {
      status: 500,
    })
  }

  return routeError("An unexpected error occurred", { status: 500 })
}

export function makeRoute<TContext = unknown>(opts: RouteOptions = {}) {
  const {
    auth = "public",
    useSupabase = true,
    applyCookies: shouldApplyCookies = true,
    rateLimit,
  } = opts

  return function route(
    handler: (ctx: RouteContext, context: TContext) => Promise<NextResponse> | NextResponse,
  ) {
    return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
      logRequest(request)
      let applyCookies = <T extends NextResponse>(res: T): T => res

      try {
        if (rateLimit) {
          const rl = await applyRateLimit(request, rateLimit.limit, rateLimit.tokenEnv)
          if (rl) return withCorsNoStore(request, rl)
        }

        if (auth === "admin") {
          const adminToken = request.headers.get("x-admin-token")
          if (adminToken !== REVALIDATION_SECRET) {
            return withCorsNoStore(request, routeError("Unauthorized", { status: 401 }))
          }
        }

        let supabase: SupabaseClient<Database> | null = null
        let session: Session | null = null

        if (useSupabase) {
          const routeClient = createSupabaseRouteClient(request)
          if (!routeClient) return serviceUnavailableResponse(request)

          if (shouldApplyCookies) {
            applyCookies = routeClient.applyCookies
          }

          supabase = routeClient.supabase

          const {
            data: { session: resolvedSession },
          } = await supabase.auth.getSession()

          session = resolvedSession

          if (auth === "user" && !session) {
            return applyCookies(withCorsNoStore(request, routeError("Unauthorized", { status: 401 })))
          }
        }

        const res = await handler({ request, supabase, session, applyCookies }, context)
        return applyCookies(withCorsNoStore(request, res))
      } catch (error) {
        return applyCookies(withCorsNoStore(request, errorToResponse(error)))
      }
    }
  }
}
