import { createServerClient } from "@supabase/ssr"
import type { cookies } from "next/headers"
import type { CookieOptions } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from "@/utils/supabase/env"

export function createClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
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
export function createAdminClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
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
