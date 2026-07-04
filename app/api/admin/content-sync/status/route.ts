import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedContentSyncRequest } from "@/lib/content-sync/admin-auth";
import { getContentSyncStatus } from "@/lib/content-sync/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content-sync/status
 *
 * Reports per-country sync cursor state and indexed row counts. Requires
 * `x-content-sync-secret` (or `Authorization: Bearer`) matching
 * `CONTENT_SYNC_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedContentSyncRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getContentSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
