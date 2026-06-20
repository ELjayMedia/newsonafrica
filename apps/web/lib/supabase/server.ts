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

export async function createServerClient(): Promise<SupabaseClient<Database> | null> {
  const config = getSupabaseConfig()

  if (!config) {
    console.error(SUPABASE_UNAVAILABLE_ERROR)
    return null
  }

  try {
    const cookieStore = await cookies()

    return createSupabaseServerClient<Database>(config.supabaseUrl, config.supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll can throw in Server Components — safe to ignore
          }
        },
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase server client", error)
    return null
  }
}
