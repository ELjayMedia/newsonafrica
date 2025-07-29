import { createServerClient } from "@supabase/ssr"
import type { cookies } from "next/headers"
import type { CookieOptions } from "@supabase/ssr"
import type { Database } from "@/lib/supabase"

export function createClient(cookieStore: ReturnType<typeof cookies>): ReturnType<typeof createServerClient<Database>> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn("Supabase environment variables are missing. Supabase features are disabled.")
    return null
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This is allowed and will be fixed in a future version.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This is allowed and will be fixed in a future version.
        }
      },
    },
  })
}

// Create a client with service role for admin operations
// IMPORTANT: This should only be used in server-side code
export function createAdminClient(cookieStore: ReturnType<typeof cookies>): ReturnType<typeof createServerClient<Database>> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.warn("Supabase environment variables are missing. Admin features are disabled.")
    return null
  }

  return createServerClient<Database>(url, serviceKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
        }
      },
    },
  })
}
