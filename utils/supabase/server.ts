import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/api/supabase"

let hasWarned = false

export function createClient(cookieStore: any) {
  if (!isSupabaseConfigured()) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase environment variables are not configured. Using fallback client.")
    }

    return getSupabaseClient()
  }

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
export function createAdminClient(cookieStore: any) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!hasWarned) {
      hasWarned = true
      console.warn("Supabase admin environment variables are not configured. Using fallback client.")
    }

    return getSupabaseClient()
  }

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
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
