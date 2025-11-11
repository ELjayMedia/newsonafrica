import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import { getSupabaseEnv, isSupabaseConfigured } from "@/utils/supabase/env"

export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv()

  if (!isSupabaseConfigured() || !url || !anonKey) {
    console.error(
      "Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    )

    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            "Supabase client is unavailable because NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured.",
          )
        },
      },
    ) as SupabaseClient<Database>
  }

  return createBrowserClient<Database>(url, anonKey)
}
