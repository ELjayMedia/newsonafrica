"use server";

import { headers } from "next/headers";

import { commercialEnquirySchema, type CommercialEnquiryInput } from "@/lib/commercial/validation";
import { createLogger } from "@/lib/log";
import { getRateLimiter, rateLimitMessage } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const log = createLogger("commercial:enquiry");

export interface CommercialEnquiryResult {
  ok: boolean;
  message: string;
}

const SUCCESS_MESSAGE = "Thanks — your brief is with the News on Africa commercial team.";
const GENERIC_ERROR = "We could not send your enquiry. Please try again or email info@newsonafrica.com.";

async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return store.get("x-real-ip")?.trim() || "unknown";
}

export async function submitCommercialEnquiry(
  input: CommercialEnquiryInput,
): Promise<CommercialEnquiryResult> {
  const parsed = commercialEnquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the details and try again.",
    };
  }

  const decision = getRateLimiter().consume("commercial:enquiry", await clientIp());
  if (!decision.ok) {
    return { ok: false, message: rateLimitMessage(decision) };
  }

  const {
    organisation,
    contactName,
    email,
    phone,
    market,
    objective,
    campaignTiming,
    budgetRange,
    productInterest,
    notes,
    sourcePath,
    sourceCampaign,
  } = parsed.data;

  try {
    const { error } = await createAdminClient().from("commercial_enquiries").insert({
      organisation,
      contact_name: contactName,
      email: email.toLowerCase(),
      phone: phone || null,
      market,
      objective,
      campaign_timing: campaignTiming || null,
      budget_range: budgetRange || null,
      product_interest: productInterest,
      notes: notes || null,
      source_path: sourcePath || "/advertise",
      source_campaign: sourceCampaign || null,
    });

    if (error) {
      log.error("Commercial enquiry insert failed", { code: error.code, message: error.message });
      return { ok: false, message: GENERIC_ERROR };
    }

    return { ok: true, message: SUCCESS_MESSAGE };
  } catch (error) {
    log.error("Commercial enquiry threw", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: GENERIC_ERROR };
  }
}
