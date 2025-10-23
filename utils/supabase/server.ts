import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/api/supabase"
import { createServerCookieAdapter } from "@/lib/supabase/cookies"
import type { Database } from "@/types/supabase"

let hasWarned = false

export function createClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase environment variables are not configured. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase environment variables are incomplete. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createServerCookieAdapter(),
  })
}

export function createAdminClient(): SupabaseClient<Database> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase admin environment variables are not configured. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: createServerCookieAdapter(),
    },
  )
}
