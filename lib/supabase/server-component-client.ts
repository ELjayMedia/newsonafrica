import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/api/supabase"
import { createServerCookieAdapter } from "@/lib/supabase/cookies"
import type { Database } from "@/types/supabase"

let hasWarnedAboutConfig = false

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    if (!hasWarnedAboutConfig) {
      hasWarnedAboutConfig = true
      console.warn("Supabase environment variables are not configured. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasWarnedAboutConfig) {
      hasWarnedAboutConfig = true
      console.warn("Supabase environment variables are incomplete. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createServerCookieAdapter(),
  })
}
