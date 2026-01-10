import { NextResponse, type NextRequest } from "next/server"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { applyRateLimit, handleApiError, withCors, logRequest } from "@/lib/api-utils"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import type { Database } from "@/types/supabase"

export type RouteContext = {
  request: NextRequest
  supabase: SupabaseClient<Database>
  session: Session | null
  applyCookies: <T extends NextResponse>(res: T) => T
}

function withCorsNoStore(request: NextRequest, response: NextResponse) {
  const res = withCors(request, response)
  res.headers.set("Cache-Control", "no-store")
  return res
}

function serviceUnavailable(request: NextRequest) {
  return withCorsNoStore(
    request,
    NextResponse.json({ success: false, error: "Supabase service unavailable" }, { status: 503 }),
  )
}

export function makeRoute(opts: {
  rateLimit?: { limit: number; tokenEnv: string }
  requireAuth?: boolean
}) {
  return function route(handler: (ctx: RouteContext) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      logRequest(request)
      let applyCookies = <T extends NextResponse>(res: T): T => res

      try {
        if (opts.rateLimit) {
          const rl = await applyRateLimit(request, opts.rateLimit.limit, opts.rateLimit.tokenEnv)
          if (rl) return withCorsNoStore(request, rl)
        }

        const routeClient = createSupabaseRouteClient(request)
        if (!routeClient) return serviceUnavailable(request)

        applyCookies = routeClient.applyCookies
        const { supabase } = routeClient

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (opts.requireAuth && !session) {
          return applyCookies(withCorsNoStore(request, handleApiError(new Error("Unauthorized"))))
        }

        const res = await handler({ request, supabase, session, applyCookies })
        return applyCookies(withCorsNoStore(request, res))
      } catch (err) {
        return applyCookies(withCorsNoStore(request, handleApiError(err)))
      }
    }
  }
}
