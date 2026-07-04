"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { resetPasswordAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/validation";

/**
 * New-password form for the recovery-link session (NOA-98). Rendered only
 * when the server confirmed a live session; on success the user is already
 * signed in, so we link onward instead of bouncing to /login.
 */
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialAuthFormState);

  if (state.status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormAlert tone="success">{state.message}</FormAlert>
          <p className="body-sm text-center text-muted-foreground">
            <Link href="/account/profile" className="text-primary underline-offset-4 hover:underline">
              Go to your profile
            </Link>{" "}
            or{" "}
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              back to the news
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Set a new password for your News on Africa account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="reset-password" className="ui-sm mb-1 block font-medium">
              New password
            </label>
            <Input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="reset-password-errors"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <FieldErrors id="reset-password-errors" errors={state.fieldErrors?.password} />
            <p className="body-sm mt-1 text-muted-foreground">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="ui-sm mb-1 block font-medium">
              Confirm new password
            </label>
            <Input
              id="reset-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby="reset-confirm-password-errors"
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            />
            <FieldErrors id="reset-confirm-password-errors" errors={state.fieldErrors?.confirmPassword} />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating password…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
