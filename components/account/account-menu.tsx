import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AccountMenuClient } from "@/components/account/account-menu-client";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/dal/profiles";

/**
 * Header account slot (NOA-99), rendered server-side (inside a Suspense
 * boundary in the root layout) so the signed-in state never flashes.
 * Signed out → a Sign in link; signed in → avatar/initial dropdown.
 */
export async function AccountMenu() {
  const user = await getUser();

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Sign in
      </Link>
    );
  }

  const profile = await getProfile(user.id);
  const displayName = profile?.display_name?.trim() || user.email || "Account";

  return (
    <AccountMenuClient
      displayName={displayName}
      email={user.email ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      isAdmin={profile?.is_admin === true}
    />
  );
}

/** Layout-stable placeholder while the account state streams in. */
export function AccountMenuFallback() {
  return <span aria-hidden className="inline-block h-10 w-10 rounded-full bg-muted" />;
}
