import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const key =
  process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabaseClient = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "noa_supabase_auth",
  },
})
