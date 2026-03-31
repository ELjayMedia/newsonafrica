import type { Database } from "@/types/supabase"

export type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"]

type WithCountry = { country?: string | null }

function toSerializable<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export function mapProfileRowToAuthProfile<T extends WithCountry | null | undefined>(profile: T): T {
  if (!profile) {
    return null as T
  }

  const country = typeof profile.country === "string" ? profile.country.toLowerCase() : profile.country ?? null

  return toSerializable({
    ...profile,
    country,
  }) as T
}
