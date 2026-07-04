/**
 * Read-only content-sync status summary (NOA-87), used by
 * `app/api/admin/content-sync/status`.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentSyncStatus } from "@/lib/supabase/types";

export interface CountrySyncStatus {
  country: string;
  syncStatus: ContentSyncStatus | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  updatedAt: string | null;
  indexedCount: number;
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
    totalIndexed: number;
  };
}

export async function getContentSyncStatus(): Promise<ContentSyncStatusSummary> {
  const supabase = createAdminClient();

  const [{ data: cursors, error: cursorError }, { data: indexRows, error: countError }] = await Promise.all([
    supabase.from("content_sync_cursor").select("country, sync_status, last_synced_at, error_message, updated_at").order("country"),
    supabase.from("content_index").select("country"),
  ]);

  if (cursorError) throw new Error(cursorError.message);
  if (countError) throw new Error(countError.message);

  const countByCountry = (indexRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.country] = (acc[row.country] ?? 0) + 1;
    return acc;
  }, {});

  const countries: CountrySyncStatus[] = (cursors ?? []).map((cursor) => ({
    country: cursor.country,
    syncStatus: cursor.sync_status,
    lastSyncedAt: cursor.last_synced_at,
    errorMessage: cursor.error_message,
    updatedAt: cursor.updated_at,
    indexedCount: countByCountry[cursor.country] ?? 0,
  }));

  const knownCountries = new Set(countries.map((c) => c.country));
  for (const country of Object.keys(countByCountry)) {
    if (!knownCountries.has(country)) {
      countries.push({
        country,
        syncStatus: null,
        lastSyncedAt: null,
        errorMessage: null,
        updatedAt: null,
        indexedCount: countByCountry[country] ?? 0,
      });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    countries,
    summary: {
      total: countries.length,
      completed: countries.filter((c) => c.syncStatus === "completed").length,
      running: countries.filter((c) => c.syncStatus === "running").length,
      failed: countries.filter((c) => c.syncStatus === "failed").length,
      neverSynced: countries.filter((c) => !c.syncStatus).length,
      totalIndexed: Object.values(countByCountry).reduce((sum, n) => sum + n, 0),
    },
  };
}
