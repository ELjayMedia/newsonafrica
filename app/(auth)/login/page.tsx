import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your News on Africa account.",
};

/**
 * Sign-in page (NOA-97). Already-authenticated visitors are bounced straight
 * to their destination. `?error=auth-code-error` is set by /auth/callback
 * when a confirmation/recovery link fails; `?reset=success` after NOA-98
 * password resets completed without a live session.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  const user = await getUser();
  if (user) redirect(next);

  return (
    <LoginForm
      next={next === "/" ? undefined : next}
      callbackError={params.error === "auth-code-error"}
      resetSuccess={params.reset === "success"}
    />
  );
}
