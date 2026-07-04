"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signUpAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/validation";

/** Email + password registration form (NOA-97), driven by `signUpAction`. */
export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthFormState);

  // Email-confirmation flow: replace the form with the "check your inbox" notice.
  if (state.status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <FormAlert tone="success">{state.message}</FormAlert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Join News on Africa to save stories and join the conversation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <div>
            <label htmlFor="register-email" className="ui-sm mb-1 block font-medium">
              Email
            </label>
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-describedby="register-email-errors"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            <FieldErrors id="register-email-errors" errors={state.fieldErrors?.email} />
          </div>

          <div>
            <label htmlFor="register-password" className="ui-sm mb-1 block font-medium">
              Password
            </label>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="register-password-errors"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <FieldErrors id="register-password-errors" errors={state.fieldErrors?.password} />
            <p className="body-sm mt-1 text-muted-foreground">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="ui-sm mb-1 block font-medium">
              Confirm password
            </label>
            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby="register-confirm-password-errors"
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            />
            <FieldErrors id="register-confirm-password-errors" errors={state.fieldErrors?.confirmPassword} />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <OAuthButtons next={next} />

        <p className="body-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
