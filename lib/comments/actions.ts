/**
 * Comment server actions (NOA-101): post, edit and soft-delete your own
 * comments. Everything runs through the cookie-bound server client, so RLS
 * (owner checks, status pinning, the status-transition guard trigger)
 * backs up the explicit checks here. All actions return `AuthFormState`
 * for React 19 `useActionState` forms, per the auth-form conventions.
 * Writes are throttled per user via the token-bucket limiter (NOA-103).
 */
"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/session";
import type { AuthFormState } from "@/lib/auth/validation";
import {
  deleteCommentSchema,
  editCommentSchema,
  postCommentSchema,
} from "@/lib/comments/validation";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { createLogger } from "@/lib/log";
import { getRateLimiter, rateLimitMessage, type RateLimitAction } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const log = createLogger("comments:actions");

const SIGN_IN_REQUIRED: AuthFormState = {
  status: "error",
  message: "Sign in to join the discussion.",
};

/**
 * Per-user throttle (NOA-103). Returns the form-state error to show, or
 * null when the action may proceed.
 */
function checkCommentRateLimit(action: RateLimitAction, userId: string): AuthFormState | null {
  const decision = getRateLimiter().consume(action, userId);
  if (decision.ok) return null;
  return { status: "error", message: rateLimitMessage(decision) };
}

const INVALID_FIELDS = (fieldErrors: Record<string, string[] | undefined>): AuthFormState => ({
  status: "error",
  message: "Please fix the highlighted fields.",
  fieldErrors,
});

/** Posts a new comment or reply on an article. */
export async function postCommentAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) return SIGN_IN_REQUIRED;

  const parsed = postCommentSchema.safeParse({
    country: formData.get("country"),
    wpPostId: formData.get("wpPostId"),
    slug: formData.get("slug"),
    parentId: formData.get("parentId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return INVALID_FIELDS(parsed.error.flatten().fieldErrors);
  }

  const { country, wpPostId, slug, parentId, body } = parsed.data;

  const limited = checkCommentRateLimit("comments:post", user.id);
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    edition_code: country,
    wp_post_id: wpPostId,
    user_id: user.id,
    parent_id: parentId,
    body,
  });

  if (error) {
    log.warn("Comment insert failed", { country, wpPostId, error: error.message });
    // The thread-integrity trigger raises for missing/deleted/cross-article parents.
    if (error.code === "P0001") {
      return { status: "error", message: "That comment can no longer be replied to." };
    }
    return { status: "error", message: "Could not post your comment. Please try again." };
  }

  revalidatePath(getArticleUrl(country, slug));
  return { status: "success", message: "Comment posted." };
}

/** Edits the body of the signed-in user's own comment. */
export async function updateCommentAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) return SIGN_IN_REQUIRED;

  const parsed = editCommentSchema.safeParse({
    commentId: formData.get("commentId"),
    country: formData.get("country"),
    slug: formData.get("slug"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return INVALID_FIELDS(parsed.error.flatten().fieldErrors);
  }

  const limited = checkCommentRateLimit("comments:edit", user.id);
  if (limited) return limited;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body, edited_at: new Date().toISOString() })
    .eq("id", parsed.data.commentId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    log.warn("Comment update failed", { commentId: parsed.data.commentId, error: error.message });
    return { status: "error", message: "Could not save your changes. Please try again." };
  }
  if (!data || data.length === 0) {
    // RLS filtered the row out: not the author, or already deleted.
    return { status: "error", message: "This comment can no longer be edited." };
  }

  revalidatePath(getArticleUrl(parsed.data.country, parsed.data.slug));
  return { status: "success", message: "Comment updated." };
}

/**
 * Soft-deletes the signed-in user's own comment: status → 'deleted' with
 * the body cleared, keeping a stub so threads with replies stay intact.
 */
export async function deleteCommentAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) return SIGN_IN_REQUIRED;

  const parsed = deleteCommentSchema.safeParse({
    commentId: formData.get("commentId"),
    country: formData.get("country"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Could not delete this comment." };
  }

  // Deletes share the edit bucket: both are mutations of an existing comment.
  const limited = checkCommentRateLimit("comments:edit", user.id);
  if (limited) return limited;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ status: "deleted", body: "" })
    .eq("id", parsed.data.commentId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    log.warn("Comment delete failed", { commentId: parsed.data.commentId, error: error.message });
    return { status: "error", message: "Could not delete this comment. Please try again." };
  }
  if (!data || data.length === 0) {
    return { status: "error", message: "This comment can no longer be deleted." };
  }

  revalidatePath(getArticleUrl(parsed.data.country, parsed.data.slug));
  return { status: "success", message: "Comment deleted." };
}
