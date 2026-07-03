/**
 * Server-side session helpers (NOA-97). Use from Server Components, Server
 * Actions and Route Handlers only.
 *
 * - `getUser()`     : current authenticated user or null. Wrapped in
 *                     React.cache so multiple calls within one request
 *                     (layout + page + header) hit Supabase once.
 * - `requireUser()` : same, but redirects to /login when signed out —
 *                     the guard for account-only pages and mutations.
 */
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  // getUser() validates the JWT against the Supabase Auth server — never
  // trust getSession() alone in server code.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser(next?: string): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}
