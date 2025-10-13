import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { SUPABASE_AUTH_STORAGE_KEY } from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

type CookieStore = ReturnType<typeof cookies>

function createCookieAdapter(cookieStore: CookieStore) {
  return {
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Silently ignore errors that can occur when mutating cookies is not supported in the current context.
        }
      })
    },
  }
}

export function createRouteClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured")
  }

  const cookieStore = cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieAdapter(cookieStore),
    cookieOptions: {
      name: SUPABASE_AUTH_STORAGE_KEY,
      path: "/",
      sameSite: "lax",
    },
  })
}

export async function getRouteSession() {
  const supabase = createRouteClient()
  return supabase.auth.getSession()
}
