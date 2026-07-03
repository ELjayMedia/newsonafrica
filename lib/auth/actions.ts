/**
 * Auth server actions (NOA-97): email+password sign up / sign in, Google
 * OAuth hand-off, and sign out. All input is zod-validated via
 * `lib/auth/validation.ts` and every action returns an `AuthFormState`
 * suitable for React 19 `useActionState`.
 */
"use server";

import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  safeNextPath,
  type AuthFormState,
} from "@/lib/auth/validation";

function siteUrl(): string {
  return publicEnv.SITE_URL.replace(/\/$/, "");
}

/** Email + password sign in. Redirects to `next` (or "/") on success. */
export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Keep the message generic — don't reveal whether the email exists.
    return {
      status: "error",
      message:
        error.code === "email_not_confirmed"
          ? "Please confirm your email address before signing in. Check your inbox for the confirmation link."
          : "Invalid email or password.",
    };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}

/**
 * Email + password registration. If email confirmation is enabled the user
 * gets a "check your inbox" notice; if a session is issued immediately we
 * send them straight to onboarding.
 */
export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Confirmation links land on the code-exchange route, then onboarding.
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/account/onboarding`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return {
        status: "error",
        message: "An account with this email already exists. Try signing in instead.",
      };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "That password is too weak — try a longer one." };
    }
    return { status: "error", message: "Could not create your account. Please try again." };
  }

  // Email confirmation disabled → session issued immediately.
  if (data.session) {
    redirect("/account/onboarding");
  }

  return {
    status: "success",
    message: "Almost there — check your inbox for a confirmation link to finish signing up.",
  };
}

/**
 * Google OAuth hand-off. Redirects the browser to the provider consent
 * screen. If the provider isn't configured on the Supabase project this
 * gracefully returns an error state instead of crashing.
 */
export async function signInWithGoogleAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNextPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    return {
      status: "error",
      message: "Google sign-in isn't available right now. Please use email and password.",
    };
  }

  redirect(data.url);
}

/** Signs the current user out and returns to the home page. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
