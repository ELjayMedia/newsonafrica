import "server-only"

import { getSupabaseServerEnv } from "@/config/supabase-env"

import { publicHeaders } from "./headers"

export function serviceRoleHeaders(): HeadersInit {
  const { supabaseServiceRoleKey } = getSupabaseServerEnv()

  return {
    ...publicHeaders(),
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  }
}
