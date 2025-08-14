import { z } from 'zod';

export const Env = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  WP_API_URL: z.string().url(),
  WP_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
});

const parsed = Env.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  WP_API_URL: process.env.WP_API_URL,
  WP_BASE_URL: process.env.WP_BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  } else {
    console.warn('Invalid env', parsed.error.flatten().fieldErrors);
  }
}

export const env = parsed.data!;
