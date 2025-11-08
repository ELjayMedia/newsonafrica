import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"

function getRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`)
  }

  return value
}

function createCookieAdapter() {
  const cookieStore = cookies()

  return {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      cookieStore.set({ name, value, ...(options ?? {}) })
    },
    remove(name: string, options?: Record<string, unknown>) {
      cookieStore.set({ name, value: "", ...(options ?? {}) })
    },
  }
}

export function getSupabaseConfig(): { supabaseUrl: string; supabaseKey: string } {
  return {
    supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  }
}

export function createClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: createCookieAdapter(),
  })
}

export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")

  return createServerClient<Database>(supabaseUrl, serviceRoleKey, {
    cookies: createCookieAdapter(),
  })
}
