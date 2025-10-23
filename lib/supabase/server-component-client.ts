import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import {
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseConfigured,
  isSupabaseEnabled,
} from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

const SUPABASE_DISABLED_MESSAGE =
  "Supabase has been disabled via environment configuration. Using fallback client."
let hasWarnedAboutConfig = false
let hasWarnedAboutDisabled = false

export function getSupabaseClient(): SupabaseClient<any, "public"> {
  if (!isSupabaseEnabled()) {
    if (!hasWarnedAboutDisabled) {
      hasWarnedAboutDisabled = true
      console.warn(SUPABASE_DISABLED_MESSAGE)
    }

    return getBrowserSupabaseClient()
  }

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
