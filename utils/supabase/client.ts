import { createBrowserClient } from "@supabase/ssr"

// Use a singleton pattern to ensure we only create one client instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  if (clientInstance) return clientInstance

  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
