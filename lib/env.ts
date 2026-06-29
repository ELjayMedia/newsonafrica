/**
 * Typed, validated environment configuration (NOA-83).
 *
 * - `publicEnv`  : NEXT_PUBLIC_* values, safe to use in client or server code.
 * - `serverEnv`  : secrets that must NEVER be imported into client components.
 *
 * Validation runs once at module load and fails fast with a single, readable
 * error listing every missing/invalid variable. Integrations (Supabase,
 * WordPress, Paystack) are wired up in later phases, so most vars are optional
 * for now — tighten `.optional()` to required as each feature lands.
 *
 * IMPORTANT: only reference `process.env.NEXT_PUBLIC_*` via explicit property
 * access (done below) so Next.js can statically inline them into the client
 * bundle. Do not import `serverEnv` from a "use client" module.
 */

import { z } from "zod";

function format(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Public (NEXT_PUBLIC_*) — bundled into the browser                  */
/* ------------------------------------------------------------------ */

const publicSchema = z.object({
  // Canonical public base URL of this frontend (no trailing slash preferred).
  SITE_URL: z.string().url().default("http://localhost:3000"),

  // Supabase (later phase)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // Paystack (later phase)
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
});

const publicParsed = publicSchema.safeParse({
  // Accept either SITE_URL or NEXT_PUBLIC_SITE_URL for the public base URL.
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
});

if (!publicParsed.success) {
  throw new Error(`Invalid public environment variables:\n${format(publicParsed.error)}`);
}

export const publicEnv = Object.freeze(publicParsed.data);
export type PublicEnv = typeof publicEnv;

/* ------------------------------------------------------------------ */
/* Server-only — never exposed to the client                          */
/* ------------------------------------------------------------------ */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase privileged access (later phase)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Headless WordPress content API (later phase)
  WORDPRESS_API_URL: z.string().url().optional(),

  // Paystack secret (later phase)
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
});

// Guard against accidentally reading server secrets in the browser.
const isServer = typeof window === "undefined";

const serverParsed = isServer
  ? serverSchema.safeParse({
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      WORDPRESS_API_URL: process.env.WORDPRESS_API_URL,
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    })
  : null;

if (serverParsed && !serverParsed.success) {
  throw new Error(`Invalid server environment variables:\n${format(serverParsed.error)}`);
}

/**
 * Server-only environment. Accessing this from a client bundle throws, which
 * surfaces misuse early instead of silently shipping empty values.
 */
export const serverEnv = Object.freeze(
  new Proxy({} as z.infer<typeof serverSchema>, {
    get(_target, prop: string) {
      if (!isServer) {
        throw new Error(
          `Attempted to read server env var "${prop}" on the client. Use publicEnv (NEXT_PUBLIC_*) instead.`,
        );
      }
      return serverParsed!.data[prop as keyof z.infer<typeof serverSchema>];
    },
  }),
);
export type ServerEnv = z.infer<typeof serverSchema>;
