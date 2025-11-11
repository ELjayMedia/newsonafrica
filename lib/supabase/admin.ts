import {
  createClient as createSupabaseAdminClient,
  type GenericSchema,
  type SupabaseClient,
} from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

type PublicSchema = Database["public"] & GenericSchema

export type AdminSupabaseClient = SupabaseClient<Database, "public", PublicSchema>

import { getSupabaseEnv } from "@/utils/supabase/env"

const { url: supabaseUrlEnv, anonKey: supabaseAnonKeyEnv } = getSupabaseEnv()
const supabaseUrl = supabaseUrlEnv ?? ""
const supabaseAnonKey = supabaseAnonKeyEnv ?? ""

let adminClient: AdminSupabaseClient | null = null
let hasWarnedAboutAdminConfig = false

export function createAdminClient(): AdminSupabaseClient {
  if (adminClient) {
    return adminClient
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    if (!hasWarnedAboutAdminConfig) {
      hasWarnedAboutAdminConfig = true
      console.warn(
        "Supabase admin environment variables are not configured. Returning default client instance.",
      )
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not configured.")
    }

    adminClient = createSupabaseAdminClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  adminClient = createSupabaseAdminClient<Database>(supabaseUrl, supabaseServiceKey, {
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
