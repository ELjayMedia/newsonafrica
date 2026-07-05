import { z } from "zod";

function format(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function formatSingle(key: string, error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${key}: ${issue.message}`).join("\n");
}

const optionalUrl = z.string().url().optional();

const publicSchema = z.object({
  SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
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

const serverSchemaShape = serverSchema.shape;
const isServer = typeof window === "undefined";

type ServerEnvShape = z.infer<typeof serverSchema>;
type ServerEnvKey = keyof ServerEnvShape;

const serverEnvCache: Partial<ServerEnvShape> = {};

const serverEnvValues: Record<ServerEnvKey, string | undefined> = {
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
};

function isServerEnvKey(prop: string): prop is ServerEnvKey {
  return prop in serverSchemaShape;
}

function loadServerEnvValue<K extends ServerEnvKey>(key: K): ServerEnvShape[K] {
  if (key in serverEnvCache) return serverEnvCache[key] as ServerEnvShape[K];

  const parsed = serverSchemaShape[key].safeParse(serverEnvValues[key]);
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${formatSingle(key, parsed.error)}`);
  }

  serverEnvCache[key] = parsed.data as ServerEnvShape[K];
  return parsed.data as ServerEnvShape[K];
}

/**
 * Lazily validates server env vars per key. This keeps public WordPress reads
 * independent from privileged Supabase/content-sync secrets, so a missing
 * admin-only key cannot blank public article feeds.
 */
export const serverEnv = Object.freeze(
  new Proxy({} as ServerEnvShape, {
    get(_target, prop: string | symbol) {
      if (!isServer) {
        throw new Error(
          `Attempted to read server env var "${String(prop)}" on the client. Use publicEnv (NEXT_PUBLIC_*) instead.`,
        );
      }

      if (typeof prop !== "string" || !isServerEnvKey(prop)) {
        return undefined;
      }

      return loadServerEnvValue(prop);
    },
  }),
);
export type ServerEnv = ServerEnvShape;
