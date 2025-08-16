import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Use a singleton pattern to ensure we only create one client instance
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

export const createClient = () => {
  if (clientInstance) return clientInstance

  clientInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "noa_supabase_auth",
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
