import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron: Content-index health report (NOA-140)
 * Scheduled job that runs the content-index health report and returns
 * a JSON digest suitable for posting to a shared channel.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Content-index health report
  const { data: healthData, error: healthError } = await supabase.rpc("content_index_health_report");

  if (healthError) {
    return NextResponse.json(
      { ok: false, error: healthError.message },
      { status: 500 }
    );
  }

  // Sync cursor status
  const { data: cursorData, error: cursorError } = await supabase
    .from("content_sync_cursor")
    .select("*")
    .order("edition_code");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    health: healthData,
    syncStatus: cursorError ? null : cursorData,
  });
}
