import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { ProfileForm } from "@/components/account/profile-form";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
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
        initialDisplayName={profile?.full_name ?? ""}
        initialPreferredCountry={profile?.country ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />

      {/* Account actions (NOA-20): sign out and, for admins, the moderation
          tools — surfaced on the profile page so they aren't only reachable via
          the header avatar menu. */}
      <section className="rounded-xl border border-border p-5">
        <h2 className="heading-sm">Account</h2>
        {profile?.is_admin ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="body-sm text-muted-foreground">Admin tools</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/account/admin/comments"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Comment moderation
              </Link>
              <Link
                href="/account/admin/content-sync"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Content sync
              </Link>
            </div>
          </div>
        ) : null}
        <form action={signOutAction} className="mt-4">
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Sign out
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="heading-sm">Delete account</h2>
        <p className="body-sm mt-2 max-w-2xl text-muted-foreground">
          This removes your sign-in account, profile details, saved articles, newsletter
          subscription tied to this email, and reader activity tied to your account.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
