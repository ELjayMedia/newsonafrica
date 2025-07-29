"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase"

// Use a singleton pattern to ensure we only create one client instance
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createClient = (): ReturnType<typeof createBrowserClient<Database>> | null => {
  if (clientInstance) return clientInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn("Supabase environment variables are missing. Supabase features are disabled.")
    return null
  }

  clientInstance = createBrowserClient<Database>(
    url,
    anonKey,
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
