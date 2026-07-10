import type { Metadata } from "next";

import { OnboardingForm } from "@/components/account/onboarding-form";
import { getProfile } from "@/lib/dal/profiles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Set up your News on Africa profile.",
};

/**
 * Minimal onboarding (NOA-99): confirm a display name and pick a preferred
 * edition, then continue straight into that edition's home page. New signups
 * land here from `signUpAction` / the confirmation-email callback.
 */
export default async function OnboardingPage() {
  const user = await requireUser("/account/onboarding");
  const profile = await getProfile(user.id);

  return (
    <OnboardingForm
      initialDisplayName={profile?.full_name ?? user.email?.split("@")[0] ?? ""}
      initialPreferredCountry={profile?.country ?? ""}
    />
  );
}
