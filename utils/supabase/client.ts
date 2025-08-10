"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/utils/supabase/env"

// Use a singleton pattern to ensure we only create one client instance
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createClient = () => {
  if (clientInstance) return clientInstance

  clientInstance = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "news-on-africa-auth",
      },
      global: {
        headers: {
          "x-application-name": "news-on-africa",
        },
      },
    },
  )

  return clientInstance
}
