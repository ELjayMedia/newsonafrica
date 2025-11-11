import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"
import { getSupabaseEnv, isSupabaseConfigured } from "@/utils/supabase/env"

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
  const { url, anonKey } = getSupabaseEnv()

  if (!url || !anonKey) {
    return null
  }

  return { supabaseUrl: url, supabaseKey: anonKey }
}

export function createServerClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  const config = getSupabaseConfig()
  if (!config) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  try {
    return createSupabaseServerClient<Database>(config.supabaseUrl, config.supabaseKey, {
      cookies: createCookieAdapter(),
    })
  } catch (error) {
    console.error("Failed to create Supabase server client", error)
    return null
  }
}
