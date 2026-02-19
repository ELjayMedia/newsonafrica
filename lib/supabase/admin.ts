import {
  createClient as createSupabaseAdminClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

import { getSupabaseServerEnv } from "@/config/supabase-env"
import type { Database } from "@/types/supabase"

export type AdminSupabaseClient = SupabaseClient<Database>

let adminClient: AdminSupabaseClient | null = null
let hasWarnedAboutAdminConfig = false

export function createAdminClient(): AdminSupabaseClient {
  if (adminClient) {
    return adminClient
  }

  let supabaseUrl: string
  let supabaseServiceRoleKey: string

  try {
    const env = getSupabaseServerEnv()
    supabaseUrl = env.supabaseUrl
    supabaseServiceRoleKey = env.supabaseServiceRoleKey
  } catch (error) {
    if (!hasWarnedAboutAdminConfig) {
      hasWarnedAboutAdminConfig = true
      console.warn("Supabase admin environment variables are not fully configured. Falling back is not supported.")
    }

    throw error
  }

  adminClient = createSupabaseAdminClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "x-application-name": "news-on-africa-admin",
      },
    },
  }) as AdminSupabaseClient

  return adminClient
}
