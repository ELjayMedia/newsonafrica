import { createBrowserClient } from "@supabase/ssr"
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
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}
