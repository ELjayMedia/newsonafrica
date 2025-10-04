"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/api/supabase"

// Use a singleton pattern to ensure we only create one client instance
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null
let hasWarned = false

export const createClient = () => {
  if (clientInstance) return clientInstance

  if (!isSupabaseConfigured()) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase environment variables are not configured. Using fallback client.")
    }

    clientInstance = getSupabaseClient()
    return clientInstance
  }

  clientInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
