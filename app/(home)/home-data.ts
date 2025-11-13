import "server-only"

import { CACHE_DURATIONS } from "@/lib/cache/constants"
import {
  AFRICAN_EDITION,
  type SupportedEdition,
} from "@/lib/editions"
import {
  buildHomeContentPropsForEditionUncached,
  buildHomeContentPropsUncached,
  type HomeContentServerProps,
} from "@/lib/home-builder"
import {
  readHomeSnapshot,
  writeHomeSnapshot,
  type HomeSnapshotRecord,
} from "@/lib/home-snapshot"

const FALLBACK_SNAPSHOT_TTL_SECONDS = CACHE_DURATIONS.VERY_LONG

async function buildSnapshotFallback(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeSnapshotRecord> {
  const startedAt = Date.now()
  const data =
    edition.code === AFRICAN_EDITION.code
      ? await buildHomeContentPropsUncached(baseUrl)
      : await buildHomeContentPropsForEditionUncached(baseUrl, edition)

  const durationMs = Date.now() - startedAt

  const record: HomeSnapshotRecord = {
    edition: edition.code,
    data,
    metadata: {
      builtAt: new Date().toISOString(),
      buildDurationMs: durationMs,
      ttfbMs: durationMs,
      source: "fallback",
    },
  }

  await writeHomeSnapshot(edition.code, record, { ttlSeconds: FALLBACK_SNAPSHOT_TTL_SECONDS })
  return record
}

async function loadSnapshotOrFallback(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeSnapshotRecord> {
  const existing = await readHomeSnapshot(edition.code)
  if (existing) {
    return existing
  }

  console.warn(`Missing home snapshot for ${edition.code}, rebuilding on-demand`)
  return buildSnapshotFallback(baseUrl, edition)
}

export async function getHomeContentSnapshot(baseUrl: string): Promise<HomeContentServerProps> {
  const snapshot = await loadSnapshotOrFallback(baseUrl, AFRICAN_EDITION)
  return snapshot.data
}

export async function getHomeContentSnapshotForEdition(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeContentServerProps> {
  const snapshot = await loadSnapshotOrFallback(baseUrl, edition)
  return snapshot.data
}

export type { HomeContentServerProps }
