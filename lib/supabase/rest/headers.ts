import { getRequiredEnvVar } from "@/lib/env"

function getSupabaseAnonKey(): string {
  return getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export function publicHeaders(): HeadersInit {
  const { supabaseAnonKey } = getSupabaseBrowserEnv()

  return {
    apikey: getSupabaseAnonKey(),
    Accept: "application/json",
  }
}

export function authHeaders(accessToken: string): HeadersInit {
  return {
    ...publicHeaders(),
    Authorization: `Bearer ${accessToken}`,
  }
}

export function jsonHeaders(headers: HeadersInit): HeadersInit {
  return {
    ...headers,
    "Content-Type": "application/json",
  }
}

export function preferHeaders(headers: HeadersInit, prefer: string): HeadersInit {
  return {
    ...headers,
    Prefer: prefer,
  }
}
