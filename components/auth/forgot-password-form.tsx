"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/validation";

/**
 * Password-reset request form (NOA-98). The success notice is identical
 * whether or not the email has an account — no enumeration.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialAuthFormState);

  if (state.status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormAlert tone="success">{state.message}</FormAlert>
          <p className="body-sm text-center text-muted-foreground">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="forgot-email" className="ui-sm mb-1 block font-medium">
              Email
            </label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-describedby="forgot-email-errors"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            <FieldErrors id="forgot-email-errors" errors={state.fieldErrors?.email} />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending link…" : "Send reset link"}
          </Button>
        </form>

        <p className="body-sm text-center text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
