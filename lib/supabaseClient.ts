import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

declare global {
  // eslint-disable-next-line no-var
  var __noaServerSupabaseClient: SupabaseClient<Database> | undefined
  // eslint-disable-next-line no-var
  var __noaBrowserSupabaseClient: SupabaseClient<Database> | undefined
}

const ensureEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export const createServerSupabase = (): SupabaseClient<Database> => {
  const supabaseUrl = ensureEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = ensureEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")

  if (!globalThis.__noaServerSupabaseClient) {
    globalThis.__noaServerSupabaseClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          "x-application-name": "news-on-africa-server",
        },
      },
    })
  }

  return globalThis.__noaServerSupabaseClient
}

export const createBrowserSupabase = (): SupabaseClient<Database> => {
  if (typeof window === "undefined") {
    throw new Error("createBrowserSupabase must be called in a browser environment")
  }

  const supabaseUrl = ensureEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = ensureEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!globalThis.__noaBrowserSupabaseClient) {
    globalThis.__noaBrowserSupabaseClient = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return globalThis.__noaBrowserSupabaseClient
}
