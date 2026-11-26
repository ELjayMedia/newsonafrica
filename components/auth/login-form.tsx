"use client";

import Link from "next/link";
import { useActionState } from "react";

import { BrandMark } from "@/components/brand-mark";
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
    <Card className="overflow-hidden rounded-2xl shadow-lg md:rounded-lg md:shadow-sm">
      <CardHeader className="hidden md:flex">
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to News on Africa.</CardDescription>
      </CardHeader>
      <CardHeader className="items-center px-6 pb-3 pt-8 text-center md:hidden">
        <BrandMark className="text-[1.4rem]" />
        <CardTitle className="mt-5 text-3xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="max-w-xs">
          Sign in to save stories, follow topics, and continue reading across the continent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-6 pt-0">
        {callbackError ? (
          <FormAlert tone="error">
            That sign-in link is invalid or has expired. Please sign in below or request a new link.
          </FormAlert>
        ) : null}
        {resetSuccess ? (
          <FormAlert tone="success">Password updated. Sign in with your new password.</FormAlert>
        ) : null}
        {state.status === "error" && state.message ? (
          <FormAlert tone="error">{state.message}</FormAlert>
        ) : null}

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
              className="h-12 rounded-xl md:h-10 md:rounded-md"
              placeholder="you@example.com"
            />
            <FieldErrors id="login-email-errors" errors={state.fieldErrors?.email} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="ui-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="ui-sm inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0"
              >
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
              className="h-12 rounded-xl md:h-10 md:rounded-md"
              placeholder="Enter your password"
            />
            <FieldErrors id="login-password-errors" errors={state.fieldErrors?.password} />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl md:h-10 md:rounded-full"
            disabled={pending}
          >
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

        <div
          className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted p-3 md:hidden"
          aria-label="Sign-in benefits"
        >
          <div className="text-center">
            <p className="text-lg" aria-hidden>
              ✓
            </p>
            <p className="ui-sm text-muted-foreground">Save stories</p>
          </div>
          <div className="text-center">
            <p className="text-lg" aria-hidden>
              ✓
            </p>
            <p className="ui-sm text-muted-foreground">Get alerts</p>
          </div>
          <div className="text-center">
            <p className="text-lg" aria-hidden>
              ✓
            </p>
            <p className="ui-sm text-muted-foreground">Personalise</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
