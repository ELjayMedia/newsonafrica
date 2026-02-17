import "server-only"

import { getRequiredEnvVar } from "@/lib/env"

import { publicHeaders } from "./headers"

function getSupabaseServiceRoleKey(): string {
  return getRequiredEnvVar("SUPABASE_SERVICE_ROLE_KEY")
}

export function serviceRoleHeaders(): HeadersInit {
  return {
    ...publicHeaders(),
    Authorization: `Bearer ${getSupabaseServiceRoleKey()}`,
  }
}
