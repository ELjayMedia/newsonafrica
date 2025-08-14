import { z } from 'zod';

function getEnvVar(name: string) {
  const value = process.env[name];
  if (typeof value !== 'string') {
    throw new Error(`Invalid environment variable: ${name} must be a string`);
  }
  return value;
}

export const Env = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  WP_API_URL: z.string().url(),
  WP_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_SEARCH_KEY: z.string().optional(),
  ALGOLIA_ADMIN_KEY: z.string().optional(),
});

const parsed = Env.safeParse({
  NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL'),
  WP_API_URL: getEnvVar('WP_API_URL'),
  WP_BASE_URL: getEnvVar('WP_BASE_URL'),
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
  ALGOLIA_SEARCH_KEY: process.env.ALGOLIA_SEARCH_KEY,
  ALGOLIA_ADMIN_KEY: process.env.ALGOLIA_ADMIN_KEY,
});

if (!parsed.success) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  } else {
    console.warn('Invalid env', parsed.error.flatten().fieldErrors);
  }
}

export const env = parsed.data!;
