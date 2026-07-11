/**
 * Newsletter sign-up server action (NOA-129). Anonymous capture: validates the
 * email, rate limits per client IP, and writes to `newsletter_subscribers` with
 * the service-role client. The table grants no client policies, so this action
 * is the only write path (see the migration + NOA-143 rationale).
 */
"use server";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/log";
import { getRateLimiter, rateLimitMessage } from "@/lib/rate-limit";
import { newsletterSignupSchema, type NewsletterSignupInput } from "@/lib/newsletter/validation";

const log = createLogger("newsletter:actions");

export interface NewsletterSignupResult {
  ok: boolean;
  message: string;
}

const SUCCESS_MESSAGE = "You're on the list — watch your inbox.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Duplicate email hits the unique index — treated as success (idempotent). */
const UNIQUE_VIOLATION = "23505";

async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return store.get("x-real-ip")?.trim() || "unknown";
}

export async function subscribeToNewsletter(input: NewsletterSignupInput): Promise<NewsletterSignupResult> {
  const parsed = newsletterSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const limiter = getRateLimiter();
  const decision = limiter.consume("newsletter:signup", await clientIp());
  if (!decision.ok) {
    return { ok: false, message: rateLimitMessage(decision) };
  }

  const { email, editionCode, sourceVertical, sourceCampaign, sourcePath } = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email,
      edition_code: editionCode ?? null,
      source_vertical: sourceVertical ?? null,
      source_campaign: sourceCampaign ?? null,
      source_path: sourcePath ?? null,
    });

    if (error && error.code !== UNIQUE_VIOLATION) {
      log.error("Newsletter sign-up insert failed", { error: error.message });
      return { ok: false, message: GENERIC_ERROR };
    }

    return { ok: true, message: SUCCESS_MESSAGE };
  } catch (error) {
    log.error("Newsletter sign-up threw", { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, message: GENERIC_ERROR };
  }
}
