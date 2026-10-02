/**
 * Read-only content-sync status summary (NOA-87 / NOA-191), used by
 * the admin status page and production-health cron.
 */
import "server-only";

import { assessContentFreshness, type ContentFreshnessStatus, type LatestContentRef } from "@/lib/content-sync/freshness";
import { listPostsForSync } from "@/lib/dal/posts";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentSyncStatus } from "@/lib/supabase/types";
import { SUPPORTED_COUNTRY_CODES, type CountryCode } from "@/lib/wordpress/countries";

export interface CountrySyncStatus {
  country: string;
  syncStatus: ContentSyncStatus | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  updatedAt: string | null;
  indexedCount: number;
  freshness: ContentFreshnessStatus;
  freshnessReason: string;
  latestWordPressPublishedAt: string | null;
  latestIndexedPublishedAt: string | null;
}

export interface ContentSyncStatusSummary {
  checkedAt: string;
  countries: CountrySyncStatus[];
  summary: {
    total: number;
    completed: number;
    running: number;
    failed: number;
    neverSynced: number;
    fresh: number;
    stale: number;
    empty: number;
    sourceUnavailable: number;
    totalIndexed: number;
  };
}

type IndexProbeRow = {
  edition_code: string;
  wp_post_id: number;
  published_at: string;
};

function latestIndexRows(rows: IndexProbeRow[]): Record<string, LatestContentRef> {
  const latest: Record<string, LatestContentRef> = {};

  for (const row of rows) {
    const existing = latest[row.edition_code];
    if (!existing || Date.parse(row.published_at) > Date.parse(existing.publishedAt)) {
      latest[row.edition_code] = {
        wpPostId: row.wp_post_id,
        publishedAt: row.published_at,
      };
    }
  }

  return latest;
}

async function probeWordPressLatest(
  country: string,
): Promise<{ latest: LatestContentRef | null; error: string | null }> {
  if (!SUPPORTED_COUNTRY_CODES.includes(country as CountryCode)) {
    return { latest: null, error: `Unsupported edition code: ${country}` };
  }

  try {
    const { posts } = await listPostsForSync(country, { page: 1, perPage: 1 });
    const post = posts[0];

    return {
      latest: post ? { wpPostId: post.id, publishedAt: post.publishedAt } : null,
      error: null,
    };
  } catch (error) {
    return {
      latest: null,
      error: error instanceof Error ? error.message : "Unknown WordPress source error",
    };
  }
}

export async function getContentSyncStatus(): Promise<ContentSyncStatusSummary> {
  const supabase = createAdminClient();

  const [{ data: cursors, error: cursorError }, { data: indexRows, error: countError }] = await Promise.all([
    supabase
      .from("content_sync_cursor")
      .select("edition_code, sync_status, last_synced_at, error_message, updated_at")
      .order("edition_code"),
    supabase.from("content_index").select("edition_code, wp_post_id, published_at"),
  ]);

  if (cursorError) throw new Error(cursorError.message);
  if (countError) throw new Error(countError.message);

  const rows = (indexRows ?? []) as IndexProbeRow[];
  const countByCountry = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.edition_code] = (acc[row.edition_code] ?? 0) + 1;
    return acc;
  }, {});
  const latestIndexedByCountry = latestIndexRows(rows);

  const cursorByCountry = new Map((cursors ?? []).map((cursor) => [cursor.edition_code, cursor]));
  const countryCodes = Array.from(
    new Set([
      ...SUPPORTED_COUNTRY_CODES,
      ...Array.from(cursorByCountry.keys()),
      ...Object.keys(countByCountry),
    ]),
  ).sort();

  const sourceProbes = await Promise.all(
    countryCodes.map(async (country) => [country, await probeWordPressLatest(country)] as const),
  );
  const sourceByCountry = new Map(sourceProbes);

  const countries: CountrySyncStatus[] = countryCodes.map((country) => {
    const cursor = cursorByCountry.get(country);
    const source = sourceByCountry.get(country) ?? { latest: null, error: "Source probe unavailable" };
    const indexedLatest = latestIndexedByCountry[country] ?? null;
    const freshness = assessContentFreshness(source.latest, indexedLatest, source.error);

    return {
      country,
      syncStatus: cursor?.sync_status ?? null,
      lastSyncedAt: cursor?.last_synced_at ?? null,
      errorMessage: cursor?.error_message ?? null,
      updatedAt: cursor?.updated_at ?? null,
      indexedCount: countByCountry[country] ?? 0,
      freshness: freshness.status,
      freshnessReason: freshness.reason,
      latestWordPressPublishedAt: source.latest?.publishedAt ?? null,
      latestIndexedPublishedAt: indexedLatest?.publishedAt ?? null,
    };
  });

  return {
    checkedAt: new Date().toISOString(),
    countries,
    summary: {
      total: countries.length,
      completed: countries.filter((c) => c.syncStatus === "completed").length,
      running: countries.filter((c) => c.syncStatus === "running").length,
      failed: countries.filter((c) => c.syncStatus === "failed").length,
      neverSynced: countries.filter((c) => !c.syncStatus).length,
      fresh: countries.filter((c) => c.freshness === "fresh").length,
      stale: countries.filter((c) => c.freshness === "stale").length,
      empty: countries.filter((c) => c.freshness === "empty").length,
      sourceUnavailable: countries.filter((c) => c.freshness === "source-unavailable").length,
      totalIndexed: Object.values(countByCountry).reduce((sum, n) => sum + n, 0),
    },
  };
}
