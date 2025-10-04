import { CACHE_DURATIONS, KV_CACHE_KEYS } from "@/lib/cache/constants"
import { createCacheEntry, kvCache } from "@/lib/cache/kv"

const LEGACY_ROUTE_TTL_SECONDS = CACHE_DURATIONS.VERY_LONG

function buildLegacyRouteKey(slug: string): string {
  return `${KV_CACHE_KEYS.LEGACY_POST_ROUTES}:${slug}`
}

export interface LegacyPostRouteEntry {
  slug: string
  country: string
  primaryCategory: string
}

export async function getLegacyPostRoute(
  slug: string,
): Promise<LegacyPostRouteEntry | null> {
  if (!slug) {
    return null
  }

  const cached = await kvCache.get<LegacyPostRouteEntry>(buildLegacyRouteKey(slug))
  return cached?.value ?? null
}

export async function setLegacyPostRoute(entry: LegacyPostRouteEntry): Promise<void> {
  if (!entry.slug) {
    return
  }

  await kvCache.set(
    buildLegacyRouteKey(entry.slug),
    createCacheEntry(entry),
    LEGACY_ROUTE_TTL_SECONDS,
  )
}

export async function deleteLegacyPostRoute(slug: string): Promise<void> {
  if (!slug) {
    return
  }

  await kvCache.delete(buildLegacyRouteKey(slug))
}
