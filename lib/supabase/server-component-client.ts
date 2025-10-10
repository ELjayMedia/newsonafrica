import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { getSupabaseClient as getBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

let hasWarnedAboutConfig = false

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    if (!hasWarnedAboutConfig) {
      hasWarnedAboutConfig = true
      console.warn("Supabase environment variables are not configured. Using fallback client.")
    }

    return getBrowserSupabaseClient()
  }

  return createServerComponentClient<Database>({
    cookies,
  })
}
