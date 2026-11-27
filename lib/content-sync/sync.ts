/**
 * Sync WordPress content into the Supabase `content_index` (NOA-87).
 *
 * Two entry points:
 *  - `syncPostById` / `deletePostFromIndex` — single-post sync, called by
 *    the WordPress webhook (NOA-88) for near-real-time updates.
 *  - `syncPostsPage` / `runBackfillForCountry` / `runBackfill` — bulk sync,
 *    called by `scripts/backfill-content-index.ts` and the admin backfill
 *    route to (re)populate the index from scratch.
 */
import "server-only";

import { getPostById, listPostsForSync } from "@/lib/dal/posts";
import { createLogger } from "@/lib/log";
import { getMetrics } from "@/lib/metrics";
import { mapPostToContentIndexRow } from "@/lib/content-sync/map-to-content-index";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentSyncStatus } from "@/lib/supabase/types";
import { SUPPORTED_COUNTRY_CODES, type CountryCode } from "@/lib/wordpress/countries";

export interface SyncError {
  wpPostId?: number;
  slug?: string;
  message: string;
}

export interface SyncPageResult {
  country: CountryCode | string;
  page: number;
  perPage: number;
  fetched: number;
  synced: number;
  hasNextPage: boolean;
  total: number;
  errors: SyncError[];
}

const DEFAULT_PER_PAGE = 50;

const log = createLogger("content-sync");

async function upsertRows(
  rows: ReturnType<typeof mapPostToContentIndexRow>[],
): Promise<SyncError[]> {
  if (rows.length === 0) return [];

  const supabase = createAdminClient();
  // `updated_at` only defaults on insert: stamp it on every sync so a re-synced
  // row shows when it was last refreshed (NOA-191).
  const syncedAt = new Date().toISOString();
  const { error } = await supabase.from("content_index").upsert(
    rows.map((row) => ({ ...row, updated_at: syncedAt })),
    { onConflict: "edition_code,wp_post_id" },
  );

  if (!error) return [];

  // Upsert is all-or-nothing per call; surface a single error covering the batch.
  return [{ message: error.message }];
}

/**
 * Fetch and upsert one page of a country's WordPress posts into the index.
 */
export async function syncPostsPage(
  country: CountryCode | string,
  { page = 1, perPage = DEFAULT_PER_PAGE }: { page?: number; perPage?: number } = {},
): Promise<SyncPageResult> {
  const { posts, total, hasNextPage } = await listPostsForSync(country, { page, perPage });

  const rows = posts.map((post) => mapPostToContentIndexRow(post));
  const errors = await upsertRows(rows);

  if (errors.length > 0) {
    log.error("Page upsert failed", { country, page, perPage, errors });
  }

  return {
    country,
    page,
    perPage,
    fetched: posts.length,
    synced: errors.length > 0 ? 0 : rows.length,
    hasNextPage,
    total,
    errors,
  };
}

/** Sync a single WordPress post (by ID) into the index — used by the webhook. */
export async function syncPostById(
  country: CountryCode | string,
  wpPostId: number,
): Promise<{ success: boolean; error?: string }> {
  const post = await getPostById(country, wpPostId);

  if (!post) {
    return deletePostFromIndex(country, wpPostId);
  }

  const supabase = createAdminClient();
  const row = { ...mapPostToContentIndexRow(post), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("content_index")
    .upsert([row], { onConflict: "edition_code,wp_post_id" });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deletePostFromIndex(
  country: CountryCode | string,
  wpPostId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_index")
    .delete()
    .match({ edition_code: country, wp_post_id: wpPostId });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

async function updateSyncCursor(
  country: CountryCode | string,
  status: ContentSyncStatus,
  errorMessage?: string,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("content_sync_cursor").upsert({
    edition_code: country,
    sync_status: status,
    error_message: errorMessage ?? null,
    updated_at: new Date().toISOString(),
    ...(status === "completed" ? { last_synced_at: new Date().toISOString() } : {}),
  });
}

export interface BackfillCountryResult {
  country: CountryCode | string;
  pagesProcessed: number;
  synced: number;
  total: number;
  errors: SyncError[];
  status: ContentSyncStatus;
}

/**
 * Page through every post for a country and upsert it into the index.
 * `maxPages` bounds a single invocation (defaults to unbounded) so the admin
 * backfill route can be called repeatedly for very large sites without a
 * single request running indefinitely.
 */
export async function runBackfillForCountry(
  country: CountryCode | string,
  {
    perPage = DEFAULT_PER_PAGE,
    startPage = 1,
    maxPages,
  }: { perPage?: number; startPage?: number; maxPages?: number } = {},
): Promise<BackfillCountryResult> {
  const startedAt = Date.now();
  log.info("Backfill started", { country, perPage, startPage, maxPages });
  await updateSyncCursor(country, "running");

  let page = startPage;
  let pagesProcessed = 0;
  let synced = 0;
  let total = 0;
  const errors: SyncError[] = [];

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await syncPostsPage(country, { page, perPage });
      pagesProcessed += 1;
      synced += result.synced;
      total = result.total;
      errors.push(...result.errors);

      if (!result.hasNextPage) break;
      if (maxPages !== undefined && pagesProcessed >= maxPages) break;
      page += 1;
    }

    const status: ContentSyncStatus = errors.length > 0 ? "failed" : "completed";
    await updateSyncCursor(
      country,
      status,
      errors.length > 0 ? `${errors.length} page(s) failed during sync` : undefined,
    );

    const durationMs = Date.now() - startedAt;
    getMetrics().observe("content_sync.backfill_ms", durationMs, {
      country: String(country),
      status,
    });
    log.info("Backfill finished", {
      country,
      status,
      pagesProcessed,
      synced,
      total,
      errorCount: errors.length,
      durationMs,
    });

    return { country, pagesProcessed, synced, total, errors, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown content sync error";
    await updateSyncCursor(country, "failed", message);

    const durationMs = Date.now() - startedAt;
    getMetrics().observe("content_sync.backfill_ms", durationMs, {
      country: String(country),
      status: "failed",
    });
    log.error("Backfill aborted", {
      country,
      pagesProcessed,
      synced,
      total,
      durationMs,
      err: error,
    });

    return {
      country,
      pagesProcessed,
      synced,
      total,
      errors: [...errors, { message }],
      status: "failed",
    };
  }
}

/** Backfill every supported country (or a subset), sequentially. */
export async function runBackfill(
  countries: readonly (CountryCode | string)[] = SUPPORTED_COUNTRY_CODES,
  options: { perPage?: number; maxPages?: number } = {},
): Promise<BackfillCountryResult[]> {
  const results: BackfillCountryResult[] = [];
  for (const country of countries) {
    results.push(await runBackfillForCountry(country, options));
  }
  return results;
}
