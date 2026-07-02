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

import { mapPost } from "@/lib/dal/mappers";
import { getPostById } from "@/lib/dal/posts";
import { mapPostToContentIndexRow } from "@/lib/content-sync/map-to-content-index";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentSyncStatus } from "@/lib/supabase/types";
import { SUPPORTED_COUNTRY_CODES, type CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressRestList } from "@/lib/wordpress/rest-client";
import type { WPRestPost } from "@/lib/wordpress/types";

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

async function upsertRows(rows: ReturnType<typeof mapPostToContentIndexRow>[]): Promise<SyncError[]> {
  if (rows.length === 0) return [];

  const supabase = createAdminClient();
  const { error } = await supabase.from("content_index").upsert(rows, { onConflict: "country,wp_post_id" });

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
  const { items, pageInfo } = await fetchWordPressRestList<WPRestPost>(country, "posts", {
    params: { page, per_page: perPage, _embed: true, orderby: "date", order: "desc" },
    // Backfill/sync always wants the freshest content — never served from cache.
    revalidate: 0,
  });

  const rows = items.map((raw) => mapPostToContentIndexRow(mapPost(raw, country)));
  const errors = await upsertRows(rows);

  return {
    country,
    page,
    perPage,
    fetched: items.length,
    synced: errors.length > 0 ? 0 : rows.length,
    hasNextPage: page < pageInfo.totalPages,
    total: pageInfo.total,
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
  const row = mapPostToContentIndexRow(post);
  const { error } = await supabase.from("content_index").upsert([row], { onConflict: "country,wp_post_id" });

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
  const { error } = await supabase.from("content_index").delete().match({ country, wp_post_id: wpPostId });

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
    country,
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
  { perPage = DEFAULT_PER_PAGE, startPage = 1, maxPages }: { perPage?: number; startPage?: number; maxPages?: number } = {},
): Promise<BackfillCountryResult> {
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
    await updateSyncCursor(country, status, errors.length > 0 ? `${errors.length} page(s) failed during sync` : undefined);

    return { country, pagesProcessed, synced, total, errors, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown content sync error";
    await updateSyncCursor(country, "failed", message);
    return { country, pagesProcessed, synced, total, errors: [...errors, { message }], status: "failed" };
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
