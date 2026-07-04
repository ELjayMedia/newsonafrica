"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signInAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/validation";

/** Email + password sign-in form (NOA-97), driven by `signInAction`. */
export function LoginForm({
  next,
  callbackError = false,
  resetSuccess = false,
}: {
  next?: string;
  /** Set when /auth/callback failed to exchange the code (expired link, etc). */
  callbackError?: boolean;
  /** Set after a completed password reset so the user knows to sign in again. */
  resetSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(signInAction, initialAuthFormState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to News on Africa.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {callbackError ? (
          <FormAlert tone="error">
            That sign-in link is invalid or has expired. Please sign in below or request a new link.
          </FormAlert>
        ) : null}
        {resetSuccess ? <FormAlert tone="success">Password updated. Sign in with your new password.</FormAlert> : null}
        {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <div>
            <label htmlFor="login-email" className="ui-sm mb-1 block font-medium">
              Email
            </label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-describedby="login-email-errors"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            <FieldErrors id="login-email-errors" errors={state.fieldErrors?.email} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="ui-sm font-medium">
                Password
              </label>
              <Link href="/forgot-password" className="ui-sm text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby="login-password-errors"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <FieldErrors id="login-password-errors" errors={state.fieldErrors?.password} />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <OAuthButtons next={next} />

        <p className="body-sm text-center text-muted-foreground">
          No account yet?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
