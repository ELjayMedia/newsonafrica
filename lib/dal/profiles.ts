/**
 * Profile data access (NOA-99). Uses the cookie-bound server client so RLS
 * applies with the caller's session. Read failures degrade to `null` — the
 * header account menu and profile page fall back to auth-user data rather
 * than crashing the page when Supabase is unreachable.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn(`Failed to load profile ${userId}: ${error.message}`);
      return null;
    }
    return data;
  } catch (error) {
    console.warn("Profile lookup skipped:", error);
    return null;
  }
}
