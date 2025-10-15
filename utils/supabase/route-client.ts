import { createServerClient } from "@supabase/ssr"

import {
  SUPABASE_AUTH_STORAGE_KEY,
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

import { createServerCookieAdapter } from "./server"

const SUPABASE_ROUTE_CONFIG_WARNING =
  "Supabase environment variables are not configured. Using fallback client."

let hasWarnedAboutMissingConfig = false

export function createSupabaseRouteClient() {
  if (!isSupabaseConfigured()) {
    if (!hasWarnedAboutMissingConfig) {
      hasWarnedAboutMissingConfig = true
      console.warn(SUPABASE_ROUTE_CONFIG_WARNING)
    }

    return getBrowserSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.")
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createServerCookieAdapter(),
    auth: {
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
    },
  })
}

export async function getRouteSession() {
  const supabase = createSupabaseRouteClient()
  return supabase.auth.getSession()
}
