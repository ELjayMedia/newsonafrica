import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/supabase"
import { SUPABASE_UNAVAILABLE_ERROR, getSupabaseConfig } from "./server"

export interface RouteClientResult {
  supabase: SupabaseClient<Database>
  applyCookies<T extends NextResponse>(response: T): T
}

export function createSupabaseRouteClient(
  request: NextRequest,
): RouteClientResult | null {
  const baseResponse = NextResponse.next()
  const deletedCookies = new Set<string>()

  const cookieStore = {
    get: (name: string) => request.cookies.get(name),
    getAll: () => request.cookies.getAll(),
    set: (...args: Parameters<typeof baseResponse.cookies.set>) => {
      const [firstArg] = args
      const name = typeof firstArg === "string" ? firstArg : firstArg.name
      deletedCookies.delete(name)
      baseResponse.cookies.set(...args)
    },
    delete: (...args: Parameters<typeof baseResponse.cookies.delete>) => {
      const [firstArg] = args
      const name = typeof firstArg === "string" ? firstArg : firstArg.name
      deletedCookies.add(name)
      baseResponse.cookies.delete(...args)
    },
  }

  const config = getSupabaseConfig()

  if (!config) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookieStore as any },
    { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey },
  )

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
