import { createServerClient } from "@supabase/ssr"
import type { cookies } from "next/headers"

// Cache the client creation to avoid redundant instantiation
const clientCache = new Map()

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  // Create a cache key based on the current request
  const cacheKey = "server-client"

  // Check if we already have a client for this request
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)
  }

  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "x-application-name": "news-on-africa",
      },
    },
  })

  // Store the client in the cache
  clientCache.set(cacheKey, client)

  // Clear cache after 5 minutes to prevent stale clients
  setTimeout(
    () => {
      clientCache.delete(cacheKey)
    },
    5 * 60 * 1000,
  )

  return client
}
