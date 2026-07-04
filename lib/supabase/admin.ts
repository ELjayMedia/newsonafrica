/**
 * Privileged Supabase client for server-only, trusted code paths (NOA-87):
 * content sync (backfill + webhook-triggered upserts) and the admin
 * content-sync routes. Uses the service role key and bypasses RLS —
 * never import this from anything reachable by an end-user request without
 * an explicit secret check in front of it.
 */
import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

let adminClient: SupabaseClient<Database> | undefined;

export function createAdminClient(): SupabaseClient<Database> {
  adminClient ??= createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "x-application-name": "news-on-africa-content-sync",
      },
    },
  });

  return adminClient;
}
