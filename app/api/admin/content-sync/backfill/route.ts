import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedContentSyncRequest } from "@/lib/content-sync/admin-auth";
import { syncPostsPage } from "@/lib/content-sync/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/wordpress/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BackfillRequestBody {
  country?: string;
  page?: number;
  perPage?: number;
}

const MAX_PER_PAGE = 100;

function normalizePositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return max ? Math.min(Math.floor(parsed), max) : Math.floor(parsed);
}

/**
 * POST /api/admin/content-sync/backfill
 *
 * Syncs a single page of a country's WordPress posts into the content
 * index — safe to call repeatedly (e.g. from a cron job) to page through an
 * entire site without risking a serverless function timeout. For a
 * one-shot full backfill from the command line, use
 * `pnpm content-sync:backfill` (scripts/backfill-content-index.ts) instead,
 * which loops through every page for every country.
 *
 * Requires `x-content-sync-secret` (or `Authorization: Bearer`) matching
 * `CONTENT_SYNC_SECRET`.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedContentSyncRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as BackfillRequestBody;
  const country = (body.country || DEFAULT_COUNTRY).trim().toLowerCase();

  if (!isValidCountry(country)) {
    return NextResponse.json({ error: `Unsupported country: ${country}` }, { status: 400 });
  }

  const page = normalizePositiveInt(body.page, 1);
  const perPage = normalizePositiveInt(body.perPage, 50, MAX_PER_PAGE);

  const supabase = createAdminClient();
  await supabase.from("content_sync_cursor").upsert({ edition_code: country, sync_status: "running", updated_at: new Date().toISOString() });

  try {
    const result = await syncPostsPage(country, { page, perPage });
    const status = result.errors.length > 0 ? "failed" : "completed";

    await supabase.from("content_sync_cursor").upsert({
      edition_code: country,
      sync_status: status,
      error_message: result.errors.length > 0 ? `${result.errors.length} post(s) failed during sync` : null,
      updated_at: new Date().toISOString(),
      ...(status === "completed" ? { last_synced_at: new Date().toISOString() } : {}),
    });

    return NextResponse.json({ ...result, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown content sync error";
    await supabase
      .from("content_sync_cursor")
      .upsert({ edition_code: country, sync_status: "failed", error_message: message, updated_at: new Date().toISOString() });

    return NextResponse.json({ country, page, perPage, status: "failed", error: message }, { status: 500 });
  }
}
