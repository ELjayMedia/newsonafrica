/**
 * Cookie-free Supabase client for public, non-personalized reads (NOA-89):
 * the `most_read_content` RPC doesn't depend on the visitor's session, so it
 * uses this instead of `@/lib/supabase/server` — that client wraps
 * `next/headers` `cookies()`, which forces the calling route to render
 * dynamically on every request (see docs/caching-strategy.md). Uses the
 * public anon key and respects RLS, same as the browser client.
 */
import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

const PUBLIC_READ_TIMEOUT_MS = 3_000;

let publicClient: SupabaseClient<Database> | undefined;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUBLIC_READ_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function createPublicClient(): SupabaseClient<Database> {
  publicClient ??= createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: fetchWithTimeout,
        headers: {
          "x-application-name": "news-on-africa-reading",
        },
      },
    },
  );

  return publicClient;
}
