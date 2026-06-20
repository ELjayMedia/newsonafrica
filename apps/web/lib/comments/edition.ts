import type { NextRequest } from "next/server"
import type { Session } from "@supabase/supabase-js"
import { AFRICAN_EDITION } from "@/lib/editions"
import { normalizeEditionCode } from "./validators"

const EDITION_COOKIE_KEYS = ["country", "preferredCountry"] as const

export function resolveRequestEdition(
  request: NextRequest,
  session: Session | null,
  profileCountry?: string | null,
): string {
  const profile = normalizeEditionCode(profileCountry)
  if (profile) return profile

  const appMeta = normalizeEditionCode(session?.user?.app_metadata?.country)
  if (appMeta) return appMeta

  const userMeta = normalizeEditionCode(session?.user?.user_metadata?.country)
  if (userMeta) return userMeta

  for (const cookieName of EDITION_COOKIE_KEYS) {
    const cookieValue = request.cookies.get(cookieName)?.value
    const normalized = normalizeEditionCode(cookieValue)
    if (normalized) return normalized
  }

  return AFRICAN_EDITION.code
}
