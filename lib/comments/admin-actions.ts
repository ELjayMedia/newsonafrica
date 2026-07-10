/**
 * Comment moderation server actions (NOA-102). Every action re-checks the
 * `profiles.is_admin` gate via requireAdmin() and then writes with the
 * service-role client — the status-guard trigger on comments reserves
 * moderation transitions for the service role, and regular RLS policies
 * never grant them to end users.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createLogger } from "@/lib/log";
import type { AuthFormState } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CommentStatus } from "@/lib/supabase/types";

const log = createLogger("comments:moderation");

const ADMIN_COMMENTS_PATH = "/account/admin/comments";

const moderationSchema = z.object({
  commentId: z.string().uuid(),
  intent: z.enum(["approve", "hide", "delete"]),
});

const INTENT_TO_STATUS: Record<z.infer<typeof moderationSchema>["intent"], CommentStatus> = {
  approve: "approved",
  hide: "hidden",
  delete: "deleted",
};

/**
 * Applies a moderation decision. `hide` is the reversible option (the body
 * is preserved and stays invisible to the public via RLS); `delete` clears
 * the body — the public sees only a thread-preserving stub. Approve
 * restores pending/hidden comments to public view.
 */
export async function moderateCommentAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireAdmin(ADMIN_COMMENTS_PATH);

  const parsed = moderationSchema.safeParse({
    commentId: formData.get("commentId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid moderation request." };
  }

  const { commentId, intent } = parsed.data;
  const status = INTENT_TO_STATUS[intent];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("comments")
    .update(intent === "delete" ? { status, body: "" } : { status })
    .eq("id", commentId)
    .select("edition_code, wp_post_id")
    .maybeSingle();

  if (error) {
    log.warn("Moderation action failed", { intent, commentId, error: error.message });
    // 23514 = check_violation: a deleted stub's body was cleared, so the
    // comments_body_present constraint blocks restoring it to public view.
    if (error.code === "23514" && intent === "approve") {
      return { status: "error", message: "Deleted comments cannot be restored." };
    }
    return { status: "error", message: "Could not update this comment. Please try again." };
  }
  if (!data) {
    return { status: "error", message: "This comment no longer exists." };
  }

  revalidatePath(ADMIN_COMMENTS_PATH);

  // Refresh the article page the comment lives on (slug comes from the
  // content index; fall back to revalidating all article pages if unknown).
  const { data: indexRow } = await supabase
    .from("content_index")
    .select("url_path")
    .eq("edition_code", data.edition_code)
    .eq("wp_post_id", data.wp_post_id)
    .maybeSingle();

  if (indexRow?.url_path) {
    revalidatePath(indexRow.url_path);
  } else {
    revalidatePath("/[countryCode]/article/[slug]", "page");
  }

  return {
    status: "success",
    message:
      intent === "approve"
        ? "Comment approved."
        : intent === "hide"
          ? "Comment hidden."
          : "Comment deleted.",
  };
}
