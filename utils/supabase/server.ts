import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"

export const SUPABASE_UNAVAILABLE_ERROR =
  "Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseKey: string
}

function createCookieAdapter() {
  const cookieStore = cookies()

  return {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      cookieStore.set({ name, value, ...(options ?? {}) })
    },
    remove(name: string, options?: Record<string, unknown>) {
      cookieStore.set({ name, value: "", ...(options ?? {}) })
    },
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return { supabaseUrl, supabaseKey }
}

export function createServerClient(): SupabaseClient<Database> | null {
  const config = getSupabaseConfig()

  if (!config) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  return createSupabaseServerClient<Database>(config.supabaseUrl, config.supabaseKey, {
    cookies: createCookieAdapter(),
  })
}
