import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/supabase"
import { SUPABASE_UNAVAILABLE_ERROR, getSupabaseConfig } from "./server"

export interface RouteClientResult {
  supabase: SupabaseClient<Database>
  applyCookies<T extends NextResponse>(response: T): T
}

function getBearerAuthorization(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null
  }

  const token = authorization.slice("bearer ".length).trim()
  return token ? `Bearer ${token}` : null
}

export function createSupabaseRouteClient(request: NextRequest): RouteClientResult | null {
  const baseResponse = NextResponse.next()
  const deletedCookies = new Set<string>()

  const config = getSupabaseConfig()

  if (!config) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  const bearerAuthorization = getBearerAuthorization(request)

  const supabase = createServerClient<Database>(config.supabaseUrl, config.supabaseKey, {
    ...(bearerAuthorization
      ? {
          global: {
            headers: {
              Authorization: bearerAuthorization,
            },
          },
        }
      : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          deletedCookies.delete(name)
          baseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const applyCookies = <T extends NextResponse>(response: T): T => {
    deletedCookies.forEach((name) => {
      response.cookies.delete(name)
    })

    baseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })

    return response
  }

  return { supabase, applyCookies }
}
