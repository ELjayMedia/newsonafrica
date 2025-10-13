import { createServerClient } from "@supabase/ssr"

import { SUPABASE_AUTH_STORAGE_KEY } from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

import { createServerCookieAdapter } from "./server"

export function createSupabaseRouteClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createServerCookieAdapter(),
      auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
    },
  )
}

export async function getRouteSession() {
  const supabase = createSupabaseRouteClient()
  return supabase.auth.getSession()
}
