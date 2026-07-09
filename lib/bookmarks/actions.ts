/**
 * Bookmark server actions (NOA-100): toggle from the article page's
 * bookmark button and remove from the saved-articles list. All writes go
 * through the cookie-bound server client, so RLS enforces ownership on top
 * of the explicit user checks here. Writes are throttled per user via the
 * token-bucket limiter (NOA-103).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/auth/session";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { isValidCountry } from "@/lib/countries";
import { createLogger } from "@/lib/log";
import { getRateLimiter, rateLimitMessage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const log = createLogger("bookmarks:actions");

const articleRef = z.object({
  country: z.string().refine(isValidCountry, "Unsupported country"),
  wpPostId: z.number().int().positive(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/i, "Invalid slug"),
});

export type ToggleBookmarkResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; requiresAuth: boolean; message: string };

/**
 * Adds or removes a bookmark for the signed-in user. `bookmarked` is the
 * DESIRED end state (the client toggles optimistically and tells us where
 * it wants to land), so double-clicks and races stay idempotent.
 */
export async function toggleBookmarkAction(input: {
  country: string;
  wpPostId: number;
  slug: string;
  bookmarked: boolean;
}): Promise<ToggleBookmarkResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, requiresAuth: true, message: "Sign in to save articles." };
  }

  const parsed = articleRef.safeParse(input);
  if (!parsed.success) {
    return { ok: false, requiresAuth: false, message: "This article can't be saved." };
  }
  const { country, wpPostId, slug } = parsed.data;

  const decision = getRateLimiter().consume("bookmarks:mutate", user.id);
  if (!decision.ok) {
    return { ok: false, requiresAuth: false, message: rateLimitMessage(decision) };
  }

  const supabase = await createClient();

  if (input.bookmarked) {
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      edition_code: country,
      wp_post_id: wpPostId,
      slug,
    });

    // 23505 = unique_violation: already saved — treat as success (idempotent).
    if (error && error.code !== "23505") {
      log.warn("Bookmark insert failed", { country, wpPostId, error: error.message });
      return { ok: false, requiresAuth: false, message: "Could not save this article. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("edition_code", country)
      .eq("wp_post_id", wpPostId);

    if (error) {
      log.warn("Bookmark delete failed", { country, wpPostId, error: error.message });
      return { ok: false, requiresAuth: false, message: "Could not remove this bookmark. Please try again." };
    }
  }

  revalidatePath(getArticleUrl(country, slug));
  revalidatePath("/account/bookmarks");
  return { ok: true, bookmarked: input.bookmarked };
}

/** Removes a bookmark from the saved-articles page (plain form action). */
export async function removeBookmarkAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const parsed = z.string().uuid().safeParse(formData.get("bookmarkId"));
  if (!parsed.success) return;

  // Void form action (no error channel): a rate-limited remove is skipped;
  // the revalidated list still showing the item is the feedback.
  const decision = getRateLimiter().consume("bookmarks:mutate", user.id);
  if (!decision.ok) {
    log.warn("Bookmark removal rate-limited", { userId: user.id });
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id);

  if (error) {
    log.warn("Bookmark removal failed", { bookmarkId: parsed.data, error: error.message });
  }

  revalidatePath("/account/bookmarks");
}
