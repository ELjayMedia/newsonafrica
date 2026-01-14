import "server-only"
import { unstable_cache } from "next/cache"

// POSTGREST CONTRACT: Avoid pg_timezone_names queries
// Cache timezone list to prevent expensive catalog queries
const TIMEZONE_CACHE_TTL = 86400 // 24 hours

let cachedTimezones: string[] | null = null

const fetchTimezones = unstable_cache(
  async (): Promise<string[]> => {
    // Return common timezones instead of querying pg_timezone_names
    return [
      "UTC",
      "Africa/Lagos",
      "Africa/Johannesburg",
      "Africa/Cairo",
      "Africa/Nairobi",
      "Africa/Casablanca",
      "Africa/Addis_Ababa",
      "Africa/Accra",
      "Africa/Abuja",
    ]
  },
  ["timezones"],
  { revalidate: TIMEZONE_CACHE_TTL },
)

export async function getTimezones(): Promise<string[]> {
  if (cachedTimezones) {
    return cachedTimezones
  }

  cachedTimezones = await fetchTimezones()
  return cachedTimezones
}

export function clearTimezoneCache(): void {
  cachedTimezones = null
}
