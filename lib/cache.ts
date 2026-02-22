/**
 * @deprecated Use `@/lib/cache/cacheTags` instead.
 * This module is retained as a compatibility shim.
 */
export { cacheTags } from "@/lib/cache/cacheTags"

import { cacheTags } from "@/lib/cache/cacheTags"

type CacheTags = typeof cacheTags

export type CacheTagBuilder = {
  [K in keyof CacheTags]: CacheTags[K]
}

export const tag: CacheTagBuilder = cacheTags
