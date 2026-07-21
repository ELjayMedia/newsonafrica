/**
 * Account deletion (NOA-149): validates the signed-in user, removes or
 * anonymises first-party reader data, then deletes the Supabase Auth user.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/auth/account-deletion-shared";
import { getUser } from "@/lib/auth/session";
import type { AuthFormState } from "@/lib/auth/validation";
import { createLogger } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const log = createLogger("auth:account-deletion");

const deletionSchema = z.object({
  confirmation: z.literal(ACCOUNT_DELETION_CONFIRMATION, {
    errorMap: () => ({ message: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm.` }),
  }),
});

type AccountDeletionResult = { ok: true } | { ok: false; step: string; message: string };

type MutationResult = {
  error: { message?: string } | null;
};

function dataDeletionFailure(
  step: string,
  error: { message?: string } | null | undefined,
): AccountDeletionResult {
  return {
    ok: false,
    step,
    message: error?.message ?? "Unknown Supabase error",
  };
}

function avatarObjectPath(avatarUrl: string | null | undefined, userId: string): string | null {
  if (!avatarUrl) return null;

  try {
    const url = new URL(avatarUrl);
    const marker = "/storage/v1/object/public/profiles/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return path.startsWith(`avatars/${userId}-`) ? path : null;
  } catch {
    return null;
  }
}

async function expectMutation(
  step: string,
  result: PromiseLike<MutationResult>,
): Promise<AccountDeletionResult> {
  const { error } = await result;
  return error ? dataDeletionFailure(step, error) : { ok: true };
}

async function deleteAccountData({
  userId,
  email,
}: {
  userId: string;
  email: string | null | undefined;
}): Promise<AccountDeletionResult> {
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return dataDeletionFailure("read profile", profileError);
  }

  const avatarPath = avatarObjectPath(profile?.avatar_url, userId);
  if (avatarPath) {
    const { error } = await supabase.storage.from("profiles").remove([avatarPath]);
    if (error) {
      return dataDeletionFailure("delete profile avatar", error);
    }
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const newsletterDelete = await expectMutation(
      "delete newsletter subscription",
      supabase.from("newsletter_subscribers").delete().eq("email", normalizedEmail),
    );
    if (!newsletterDelete.ok) return newsletterDelete;
  }

  const bookmarkDelete = await expectMutation(
    "delete bookmarks",
    supabase.from("bookmarks").delete().eq("user_id", userId),
  );
  if (!bookmarkDelete.ok) return bookmarkDelete;

  // Detach the leaving reader's comments from their identity BEFORE deleting
  // the Auth user. Setting user_id to null (in addition to soft-deleting) is
  // load-bearing: comments.user_id carries an ON DELETE CASCADE FK to profiles
  // (comments_user_id_profiles_fkey), so if these rows still pointed at the
  // profile when the Auth user — and, by cascade, the profile — is deleted,
  // they would be hard-deleted, cascading through comments.parent_id and taking
  // other readers' replies with them. Nulling user_id first leaves them as
  // authorless "deleted" stubs that survive the cascade, so reply threads stay
  // intact. Requires the nullable user_id migration (20260721000000).
  const commentAnonymise = await expectMutation(
    "anonymise comments",
    supabase
      .from("comments")
      .update({ user_id: null, status: "deleted", body: "", reported_by: null, report_reason: null })
      .eq("user_id", userId),
  );
  if (!commentAnonymise.ok) return commentAnonymise;

  const reportAnonymise = await expectMutation(
    "clear comment reports",
    supabase
      .from("comments")
      .update({ reported_by: null, report_reason: null })
      .eq("reported_by", userId),
  );
  if (!reportAnonymise.ok) return reportAnonymise;

  // comments.reviewed_by references auth.users with NO ACTION, so any comment
  // this user moderated would otherwise block the Auth-user delete. Clear it.
  const reviewAnonymise = await expectMutation(
    "clear comment reviews",
    supabase.from("comments").update({ reviewed_by: null }).eq("reviewed_by", userId),
  );
  if (!reviewAnonymise.ok) return reviewAnonymise;

  const searchLogAnonymise = await expectMutation(
    "disconnect search logs",
    supabase.from("search_query_log").update({ user_id: null }).eq("user_id", userId),
  );
  if (!searchLogAnonymise.ok) return searchLogAnonymise;

  const anonymisedProfile: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: "Deleted reader",
    avatar_url: null,
    username: null,
    handle: null,
    email: null,
    website: null,
    bio: null,
    country: null,
    location: null,
    interests: null,
    preferences: null,
    onboarded: false,
    role: null,
  };

  const profileAnonymise = await expectMutation(
    "anonymise profile",
    supabase.from("profiles").update(anonymisedProfile).eq("id", userId),
  );
  if (!profileAnonymise.ok) return profileAnonymise;

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return dataDeletionFailure("delete auth user", error);
  }

  return { ok: true };
}

export async function deleteAccountAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = deletionSchema.safeParse({ confirmation: formData.get("confirmation") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please confirm account deletion exactly.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getUser();
  if (!user) {
    return { status: "error", message: "Sign in before deleting your account." };
  }

  const result = await deleteAccountData({ userId: user.id, email: user.email });
  if (!result.ok) {
    log.warn("Account deletion failed", {
      userId: user.id,
      step: result.step,
      error: result.message,
    });
    return {
      status: "error",
      message:
        "Could not delete your account completely. Please try again or contact privacy@newsonafrica.com.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    log.warn("Account deletion completed but local sign-out failed", {
      userId: user.id,
      error: error.message,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/account/profile");

  return {
    status: "success",
    message: "Your account and associated reader data have been deleted.",
  };
}
