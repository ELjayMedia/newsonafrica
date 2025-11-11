import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import { getSupabaseEnv, isSupabaseConfigured as isSupabaseEnvConfigured } from "@/utils/supabase/env"

let browserClient: SupabaseClient<Database> | null = null

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name} environment variable for Supabase configuration`)
  }

  return value
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseEnvConfigured()
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv()
    const supabaseUrl = requireEnv(url ?? undefined, "NEXT_PUBLIC_SUPABASE_URL")
    const supabaseAnonKey = requireEnv(anonKey ?? undefined, "NEXT_PUBLIC_SUPABASE_ANON_KEY")

    browserClient = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
      isSingleton: true,
    })
  }

  return browserClient
}

