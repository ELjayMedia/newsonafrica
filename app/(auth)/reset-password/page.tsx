import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your News on Africa account.",
};

/**
 * New-password page (NOA-98). Reached from the recovery email via
 * /auth/callback, which exchanges the code and establishes a session. If no
 * session is present (expired/tampered link, direct visit) we explain how to
 * get a fresh link instead of showing a form that can only fail.
 */
export default async function ResetPasswordPage() {
  const user = await getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset link needed</CardTitle>
          <CardDescription>
            This page only works right after following a password reset link, and yours is missing or has
            expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="body-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Request a new reset link
            </Link>{" "}
            or{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
