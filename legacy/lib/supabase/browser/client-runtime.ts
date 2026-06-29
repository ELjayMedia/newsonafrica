import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import { createClient as createBrowserClient } from "../browser-client"

export const SUPABASE_CONFIG_ERROR =
  "Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."

let browserClient: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient()
}

function ensureSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_CONFIG_ERROR)
    }

    browserClient = createClient()
  }

  return browserClient
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  return ensureSupabaseClient()
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = ensureSupabaseClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
  set(_target, prop, value) {
    const client = ensureSupabaseClient()
    Reflect.set(client as object, prop, value)
    return true
  },
  has(_target, prop) {
    const client = ensureSupabaseClient()
    return Reflect.has(client as object, prop)
  },
}) as SupabaseClient<Database>

export function resetSupabaseBrowserClientForTests(): void {
  browserClient = null
}
