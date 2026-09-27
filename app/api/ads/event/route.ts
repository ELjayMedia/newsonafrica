import { z } from "zod";

import { createLogger } from "@/lib/log";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const log = createLogger("ads:event");

const schema = z.object({
  eventType: z.enum(["impression", "click"]),
  placementType: z.enum(["ad_slot", "sponsored_card", "takeover", "native"]),
  campaignId: z.string().trim().min(1).max(120),
  sponsorName: z.string().trim().min(1).max(160),
  editionCode: z.string().regex(/^[a-z]{2,3}$/),
  country: z.string().regex(/^[a-z]{2,3}$/),
  vertical: z.string().trim().max(120).nullable().optional(),
  articleId: z.number().int().positive().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
});

function requestSubject(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 4096) return new Response(null, { status: 413 });

  const decision = getRateLimiter().consume("ads:event", requestSubject(request));
  if (!decision.ok) return new Response(null, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const { error } = await createAdminClient().from("ad_events").insert({
    event_type: parsed.data.eventType,
    placement_type: parsed.data.placementType,
    campaign_id: parsed.data.campaignId,
    sponsor_name: parsed.data.sponsorName,
    edition_code: parsed.data.editionCode,
    country: parsed.data.country,
    vertical: parsed.data.vertical ?? null,
    article_id: parsed.data.articleId ?? null,
    session_id: parsed.data.sessionId ?? null,
    metadata: { source: "sponsored_article" },
  });

  if (error) {
    log.error("Campaign event insert failed", { code: error.code, message: error.message });
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 204 });
}
