import { z } from "zod";

/**
 * Newsletter sign-up validation (NOA-129). Kept free of `server-only` imports so
 * both the client form and the server action can share the schema, and the rules
 * are unit-testable in isolation.
 */

const OPTIONAL_TAG = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-z0-9_-]*$/i, "Invalid tag")
  .optional()
  .transform((value) => (value ? value : undefined));

export const newsletterSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(254)
    .email("Enter a valid email address.")
    // Store addresses case-insensitively so the unique index dedupes reliably.
    .transform((value) => value.toLowerCase()),
  editionCode: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/i, "Invalid edition")
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined)),
  sourceVertical: OPTIONAL_TAG,
  sourceCampaign: OPTIONAL_TAG,
  sourcePath: z.string().trim().max(255).optional(),
});

export type NewsletterSignupInput = z.input<typeof newsletterSignupSchema>;
export type NewsletterSignupData = z.output<typeof newsletterSignupSchema>;

/** Lightweight client-side check to gate the request before hitting the server. */
export function isProbablyValidEmail(email: string): boolean {
  return newsletterSignupSchema.shape.email.safeParse(email).success;
}
