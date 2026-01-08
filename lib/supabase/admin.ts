import {
  createClient as createSupabaseAdminClient,
  type GenericSchema,
  type SupabaseClient,
} from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

type PublicSchema = Database["public"] & GenericSchema

export type AdminSupabaseClient = SupabaseClient<Database, "public", PublicSchema>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

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
        "Supabase admin environment variables are not fully configured. Falling back is not supported.",
      )
    }

    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to initialize the Supabase admin client.")
    }

    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to initialize the Supabase admin client. Configure it before running admin tasks or migrations.",
    )
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
