import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseBrowserEnv, hasSupabaseBrowserEnv } from "@/config/supabase-env"
import type { Database } from "@/types/supabase"

let browserClient: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  return hasSupabaseBrowserEnv()
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv()

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
