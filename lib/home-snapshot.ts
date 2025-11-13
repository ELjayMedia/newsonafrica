import "server-only"

import { createCacheEntry, kvCache } from "@/lib/cache/kv"
import type { HomeContentServerProps } from "@/lib/home-builder"

const HOME_SNAPSHOT_NAMESPACE = "home_snapshots"
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 // 24 hours

const inMemoryStore = new Map<string, HomeSnapshotRecord>()

export interface HomeSnapshotMetadata {
  builtAt: string
  buildDurationMs: number
  ttfbMs?: number | null
  source?: "rebuild" | "fallback"
}

export interface HomeSnapshotRecord {
  edition: string
  data: HomeContentServerProps
  metadata: HomeSnapshotMetadata
}

function createSnapshotKey(edition: string): string {
  return `${HOME_SNAPSHOT_NAMESPACE}:${edition}`
}

function rememberSnapshot(key: string, record: HomeSnapshotRecord | null) {
  if (record) {
    inMemoryStore.set(key, record)
  } else {
    inMemoryStore.delete(key)
  }
}

export async function readHomeSnapshot(edition: string): Promise<HomeSnapshotRecord | null> {
  const key = createSnapshotKey(edition)

  if (kvCache.isEnabled) {
    const entry = await kvCache.get<HomeSnapshotRecord>(key)

    if (entry?.value) {
      const record = entry.value
      rememberSnapshot(key, record)
      return record
    }
  }

  return inMemoryStore.get(key) ?? null
}

interface WriteOptions {
  ttlSeconds?: number
}

export async function writeHomeSnapshot(
  edition: string,
  record: HomeSnapshotRecord,
  options: WriteOptions = {},
): Promise<void> {
  const key = createSnapshotKey(edition)
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS

  rememberSnapshot(key, record)

  if (kvCache.isEnabled) {
    await kvCache.set(key, createCacheEntry(record), ttlSeconds)
  }
}

export async function deleteHomeSnapshot(edition: string): Promise<void> {
  const key = createSnapshotKey(edition)
  inMemoryStore.delete(key)

  if (kvCache.isEnabled) {
    await kvCache.delete(key)
  }
}

export function getSnapshotCacheKey(edition: string): string {
  return createSnapshotKey(edition)
}

export function isSnapshotStale(record: HomeSnapshotRecord | null, maxAgeMs: number): boolean {
  if (!record) {
    return true
  }

  const builtAt = Date.parse(record.metadata.builtAt)
  if (Number.isNaN(builtAt)) {
    return true
  }

  return Date.now() - builtAt > maxAgeMs
}
