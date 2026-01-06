import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/config"
import type { Database } from "@/types/supabase"

let browserClient: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseUrl()
    getSupabaseAnonKey()
    return true
  } catch {
    return false
  }
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

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
