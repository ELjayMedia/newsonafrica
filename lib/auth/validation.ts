/**
 * Zod schemas + shared form-state types for the auth flows (NOA-97/98).
 * Client-safe (no server-only imports) so client form components and the
 * server actions in `lib/auth/actions.ts` validate identically.
 */
import { z } from "zod";

import { isValidCountry } from "@/lib/countries";

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Profile settings (NOA-99): display name is required; preferred country is
 * optional and must be a supported edition (empty select → null); avatar URL
 * is optional here — ownership of the storage path is enforced server-side
 * in the update action.
 */
export const profileSchema = z.object({
  displayName: z
    .string({ required_error: "Display name is required" })
    .trim()
    .min(1, "Display name is required")
    .max(80, "Display name must be at most 80 characters"),
  preferredCountry: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || isValidCountry(value), "Choose a supported country")
    .transform((value) => (value === "" ? null : value))
    .nullish()
    .transform((value) => value ?? null),
  avatarUrl: z
    .string()
    .trim()
    .url("Avatar must be a valid URL")
    .max(2048, "Avatar URL is too long")
    .nullish()
    .or(z.literal("").transform(() => null))
    .transform((value) => value ?? null),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Result shape returned by every auth server action (for useActionState). */
export type AuthFormState = {
  status: "idle" | "error" | "success";
  /** Top-level message (error banner or success notice). */
  message?: string;
  /** Per-field validation errors keyed by input name. */
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };

/**
 * Only allow same-origin path redirects (e.g. "/profile", "/sz/article/x").
 * Rejects absolute URLs and protocol-relative ("//evil.com") values.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
