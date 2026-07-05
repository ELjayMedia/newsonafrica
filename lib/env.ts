import { z } from "zod";

function format(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

const optionalUrl = z.string().url().optional();

const publicSchema = z.object({
  SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_WP_NG_GRAPHQL: optionalUrl,
  NEXT_PUBLIC_WP_NG_REST_BASE: optionalUrl,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
});

const publicParsed = publicSchema.safeParse({
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WP_NG_GRAPHQL: process.env.NEXT_PUBLIC_WP_NG_GRAPHQL || undefined,
  NEXT_PUBLIC_WP_NG_REST_BASE: process.env.NEXT_PUBLIC_WP_NG_REST_BASE || undefined,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
});

if (!publicParsed.success) {
  throw new Error(`Invalid public environment variables:\n${format(publicParsed.error)}`);
}

export const publicEnv = Object.freeze(publicParsed.data);
export type PublicEnv = typeof publicEnv;

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORDPRESS_API_URL: z.string().url(),
  WORDPRESS_API_AUTH_HEADER: z.string().min(1).optional(),
  WORDPRESS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  WORDPRESS_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(8).optional(),
  WORDPRESS_RETRY_BACKOFF_MS: z.coerce.number().int().positive().optional(),
  WORDPRESS_WEBHOOK_SECRET: z.string().min(16),
  CONTENT_SYNC_SECRET: z.string().min(16),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
});

const isServer = typeof window === "undefined";
let serverEnvCache: z.infer<typeof serverSchema> | null = null;

function loadServerEnv(): z.infer<typeof serverSchema> {
  if (serverEnvCache) return serverEnvCache;
  const parsed = serverSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WORDPRESS_API_URL: process.env.WORDPRESS_API_URL,
    WORDPRESS_API_AUTH_HEADER: process.env.WORDPRESS_API_AUTH_HEADER,
    WORDPRESS_REQUEST_TIMEOUT_MS: process.env.WORDPRESS_REQUEST_TIMEOUT_MS,
    WORDPRESS_RETRY_ATTEMPTS: process.env.WORDPRESS_RETRY_ATTEMPTS,
    WORDPRESS_RETRY_BACKOFF_MS: process.env.WORDPRESS_RETRY_BACKOFF_MS,
    WORDPRESS_WEBHOOK_SECRET: process.env.WORDPRESS_WEBHOOK_SECRET,
    CONTENT_SYNC_SECRET: process.env.CONTENT_SYNC_SECRET,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${format(parsed.error)}`);
  }
  serverEnvCache = parsed.data;
  return serverEnvCache;
}

export const serverEnv = Object.freeze(
  new Proxy({} as z.infer<typeof serverSchema>, {
    get(_target, prop: string) {
      if (!isServer) {
        throw new Error(
          `Attempted to read server env var "${prop}" on the client. Use publicEnv (NEXT_PUBLIC_*) instead.`,
        );
      }
      return loadServerEnv()[prop as keyof z.infer<typeof serverSchema>];
    },
  }),
);
export type ServerEnv = z.infer<typeof serverSchema>;
