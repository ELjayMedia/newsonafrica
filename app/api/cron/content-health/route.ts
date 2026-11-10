import { NextResponse } from "next/server";

import { getContentSyncStatus } from "@/lib/content-sync/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Coolify scheduled task: content-index health report (NOA-140 / NOA-191).
 *
 * A non-2xx response is deliberate when the WordPress mirror is stale or the
 * source cannot be checked, so production monitoring cannot treat an old
 * "completed" cursor as healthy.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [{ data: healthData, error: healthError }, freshness] = await Promise.all([
    supabase.rpc("content_index_health_report"),
    getContentSyncStatus(),
  ]);

  if (healthError) {
    return NextResponse.json({ ok: false, error: healthError.message }, { status: 500 });
  }

  const degraded = freshness.summary.stale > 0 || freshness.summary.sourceUnavailable > 0;

  return NextResponse.json(
    {
      ok: !degraded,
      generatedAt: new Date().toISOString(),
      health: healthData,
      freshness,
    },
    { status: degraded ? 503 : 200 },
  );
}
