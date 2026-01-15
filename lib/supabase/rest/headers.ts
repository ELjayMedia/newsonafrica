const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function publicHeaders(): HeadersInit {
  return {
    apikey: ANON_KEY,
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
