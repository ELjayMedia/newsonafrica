import { z } from "zod";

import { createLogger } from "@/lib/log";
import { getRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const log = createLogger("analytics:page-view");

const pageViewSchema = z.object({
  path: z.string().min(1).max(2048).startsWith("/").refine((value) => !value.includes("?"), {
    message: "Path must not contain a query string.",
  }),
  editionCode: z.string().regex(/^[a-z]{2,3}$/).nullable(),
  contentType: z.enum([
    "home",
    "edition",
    "article",
    "category",
    "tag",
    "author",
    "search",
    "commercial",
    "legal",
    "auth",
    "other",
  ]),
  sessionId: z.string().uuid(),
  referrerHost: z.string().max(255).nullable(),
  deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]),
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

  const decision = getRateLimiter().consume("analytics:view", requestSubject(request));
  if (!decision.ok) return new Response(null, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const parsed = pageViewSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const { error } = await createAdminClient().from("analytics_page_views").insert({
    path: parsed.data.path,
    edition_code: parsed.data.editionCode,
    content_type: parsed.data.contentType,
    session_id: parsed.data.sessionId,
    referrer_host: parsed.data.referrerHost,
    device_class: parsed.data.deviceClass,
  });

  if (error) {
    log.error("Page-view insert failed", { code: error.code, message: error.message });
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 204 });
}
