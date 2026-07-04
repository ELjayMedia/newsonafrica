/**
 * Supabase client for Server Components, Route Handlers and Server Actions
 * (NOA-87). Uses the public anon key + the request's cookies, so it
 * respects RLS and any authenticated user session. For privileged writes
 * (content sync), use `@/lib/supabase/admin` instead.
 */
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` is called from a Server Component in some code paths,
          // where cookie mutation isn't allowed — safe to ignore as long as
          // middleware refreshes the session.
        }
      },
    },
  });
}
