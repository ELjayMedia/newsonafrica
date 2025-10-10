import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { getSupabaseClient as getBrowserSupabaseClient } from "@/lib/api/supabase"
import { getSupabaseClient as getServerComponentSupabaseClient } from "@/lib/supabase/server-component-client"
import type { Database } from "@/types/supabase"

let hasWarned = false

export function createClient(): SupabaseClient<Database> {
  return getServerComponentSupabaseClient()
}

function getCookieAdapter() {
  const cookieStore = cookies()

  return {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
      try {
        cookieStore.set({ name, value, ...options })
      } catch (error) {
        // The `set` method was called from a Server Component.
        // This is allowed and will be fixed in a future version.
      }
    },
    remove(name: string, options: CookieOptions) {
      try {
        cookieStore.set({ name, value: "", ...options })
      } catch (error) {
        // The `delete` method was called from a Server Component.
        // This is allowed and will be fixed in a future version.
      }
    },
  }
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
      cookies: getCookieAdapter(),
    },
  )
}
