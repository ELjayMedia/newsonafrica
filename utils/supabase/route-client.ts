import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  SUPABASE_AUTH_STORAGE_KEY,
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseEnabled,
} from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

import { createServerCookieAdapter } from "./server"

const SUPABASE_DISABLED_MESSAGE =
  "Supabase has been disabled via environment configuration. Using fallback client for route handlers."
const SUPABASE_CONFIG_WARNING =
  "Supabase environment variables are not configured. Using fallback client for route handlers."

let hasWarnedAboutDisabled = false
let hasWarnedAboutConfig = false

export function createSupabaseRouteClient(): SupabaseClient<Database> {
  if (!isSupabaseEnabled()) {
    if (!hasWarnedAboutDisabled) {
      hasWarnedAboutDisabled = true
      console.warn(SUPABASE_DISABLED_MESSAGE)
    }

    return getBrowserSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasWarnedAboutConfig) {
      hasWarnedAboutConfig = true
      console.warn(SUPABASE_CONFIG_WARNING)
    }

    return getBrowserSupabaseClient()
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
