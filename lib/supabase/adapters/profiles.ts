import type { Database } from "@/types/supabase"

export type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"]

function toSerializable<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export function mapProfileRowToAuthProfile(profile: AuthProfile | null | undefined): AuthProfile | null {
  if (!profile) {
    return null
  }

  const country = typeof profile.country === "string" ? profile.country.toLowerCase() : null

  return toSerializable({
    ...profile,
    country,
  })
}
