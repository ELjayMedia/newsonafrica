/**
 * Profile server actions (NOA-99): update display name, preferred country
 * and avatar URL for the signed-in user. The avatar file itself is uploaded
 * straight from the browser to the owner-scoped `profiles` storage bucket;
 * this action only persists the resulting public URL after verifying it
 * points at the caller's own objects.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import { createLogger } from "@/lib/log";
import { requireUser } from "@/lib/auth/session";
import { profileSchema, type AuthFormState } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";

const log = createLogger("auth:profile");

/** Mirrors app/api/set-country/route.ts — one preferred-country mechanism. */
const COUNTRY_COOKIE = "country";
const SIX_MONTHS_IN_SECONDS = 15_552_000;

/** Public-object URL prefix that proves an avatar lives in the caller's own slice of the bucket. */
function ownAvatarPrefix(userId: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/profiles/avatars/${userId}-`;
}

export async function updateProfileAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser("/account/profile");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    preferredCountry: formData.get("preferredCountry"),
    avatarUrl: formData.get("avatarUrl"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { displayName, preferredCountry, avatarUrl } = parsed.data;

  // Only accept avatar URLs that point into this user's own storage prefix —
  // rejects arbitrary/external URLs and other users' objects.
  if (avatarUrl && !avatarUrl.startsWith(ownAvatarPrefix(user.id))) {
    return {
      status: "error",
      message: "Avatar upload failed. Please choose the image again.",
      fieldErrors: { avatarUrl: ["Avatar must be uploaded through the avatar picker."] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: displayName,
    country: preferredCountry,
    // Keep an existing avatar when the form submits without one.
    ...(avatarUrl !== null ? { avatar_url: avatarUrl } : {}),
  });

  if (error) {
    log.warn("Profile update failed", { userId: user.id, error: error.message });
    return { status: "error", message: "Could not save your profile. Please try again." };
  }

  // Reuse the existing preferred-country cookie so the edition notice and
  // country routing pick the change up immediately.
  if (preferredCountry && isValidCountry(preferredCountry)) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: COUNTRY_COOKIE,
      value: preferredCountry,
      maxAge: SIX_MONTHS_IN_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  // Header account menu + account pages render profile data server-side.
  revalidatePath("/", "layout");

  // Onboarding submits with intent=onboarding and continues to the reader's edition.
  if (formData.get("intent") === "onboarding") {
    redirect(`/${preferredCountry ?? DEFAULT_COUNTRY}`);
  }

  return { status: "success", message: "Profile saved." };
}
