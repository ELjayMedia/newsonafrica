import "server-only"

import { publicHeaders } from "./headers"

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function serviceRoleHeaders(): HeadersInit {
  return {
    ...publicHeaders(),
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  }
}
