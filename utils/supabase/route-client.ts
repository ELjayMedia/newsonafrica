import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { SUPABASE_AUTH_STORAGE_KEY } from "@/lib/api/supabase"
import { createServerCookieAdapter } from "@/lib/supabase/cookies"
import type { Database } from "@/types/supabase"

export function createSupabaseRouteClient(): SupabaseClient<Database, "public"> {
  return createServerClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createServerCookieAdapter(),
      auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
      db: {
        schema: "public",
      },
    },
  )
}

export async function getRouteSession() {
  const supabase = createSupabaseRouteClient()
  return supabase.auth.getSession()
}
