import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { getSupabaseBrowserEnvOrNull, SUPABASE_UNAVAILABLE_ERROR } from "@/config/supabase-env"
import type { Database } from "@/types/supabase"

export { SUPABASE_UNAVAILABLE_ERROR }

export interface SupabaseConfig {
  supabaseUrl: string
  supabaseKey: string
}

function createCookieAdapter() {
  const cookieStore = cookies() as unknown as {
    get: (name: string) => { value: string } | undefined
    set: (options: Record<string, unknown>) => void
  }

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
  const env = getSupabaseBrowserEnvOrNull()

  if (!env) {
    return null
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseKey: env.supabaseAnonKey,
  }
}

export function createServerClient(): SupabaseClient<Database> | null {
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
