/**
 * Admin gate for moderation surfaces (NOA-102).
 *
 * Gating choice: `profiles.is_admin` (migration 20260703114000), checked
 * server-side here before any admin page renders or admin action runs.
 * Client updates to the column are revoked at the SQL grant level, so the
 * flag can only be set by operators via SQL / the service role. Moderation
 * writes then use the service-role client — no client-facing RLS policy
 * grants moderation powers.
 *
 * Fails closed: any lookup problem (Supabase down, missing profile row)
 * counts as "not an admin". Non-admins get a 404, not a redirect, so the
 * admin area's existence isn't advertised.
 */
import "server-only";

import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Whether the given user is an admin. Errors degrade to false. */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn(`Admin check failed for ${userId}: ${error.message}`);
      return false;
    }
    return data?.is_admin === true;
  } catch (error) {
    console.warn("Admin check skipped:", error);
    return false;
  }
}

/**
 * Guard for admin pages and actions: requires a signed-in user with
 * `profiles.is_admin`. Signed-out → /login (via requireUser); signed-in
 * non-admin → 404.
 */
export async function requireAdmin(next?: string): Promise<User> {
  const user = await requireUser(next);
  if (!(await isAdmin(user.id))) {
    notFound();
  }
  return user;
}
