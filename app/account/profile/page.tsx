import type { Metadata } from "next";

import { ProfileForm } from "@/components/account/profile-form";
import { getProfile } from "@/lib/dal/profiles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Manage your News on Africa profile.",
};

/** Profile settings page (NOA-99): display name, preferred edition, avatar. */
export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const profile = await getProfile(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Your profile</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        initialDisplayName={profile?.display_name ?? ""}
        initialPreferredCountry={profile?.preferred_country ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
