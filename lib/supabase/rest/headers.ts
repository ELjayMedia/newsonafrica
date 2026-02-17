import { getSupabaseBrowserEnv } from "@/config/supabase-env"

export function publicHeaders(): HeadersInit {
  const { supabaseAnonKey } = getSupabaseBrowserEnv()

  return {
    apikey: supabaseAnonKey,
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
