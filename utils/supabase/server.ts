import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name} environment variable for Supabase configuration`)
  }

  return value
}

function createCookieMethods() {
  const cookieStore = cookies()

  return {
    getAll(): { name: string; value: string }[] {
      try {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
      } catch {
        return []
      }
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...(options ?? {}) })
        })
      } catch {
        // Setting cookies may not be supported in some server execution contexts.
      }
    },
  }
}

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieMethods(),
  })
}

export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")

  return createServerClient<Database>(supabaseUrl, serviceRoleKey, {
    cookies: createCookieMethods(),
  })
}
