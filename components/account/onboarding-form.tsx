"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { updateProfileAction } from "@/lib/auth/profile";
import { initialAuthFormState } from "@/lib/auth/validation";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  PUBLIC_COUNTRY_LIST,
  isPublicCountry,
  isValidCountry,
} from "@/lib/countries";

/**
 * Minimal onboarding form (NOA-99). Reuses `updateProfileAction` with
 * `intent=onboarding`, which redirects into the chosen edition on success.
 */
export function OnboardingForm({
  initialDisplayName,
  initialPreferredCountry,
}: {
  initialDisplayName: string;
  initialPreferredCountry: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialAuthFormState);
  const countryOptions =
    isValidCountry(initialPreferredCountry) && !isPublicCountry(initialPreferredCountry)
      ? [COUNTRIES[initialPreferredCountry], ...PUBLIC_COUNTRY_LIST]
      : PUBLIC_COUNTRY_LIST;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to News on Africa</CardTitle>
        <CardDescription>
          Two quick things and you&apos;re in — you can change both later on your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <input type="hidden" name="intent" value="onboarding" />
          {state.status === "error" && state.message ? (
            <FormAlert tone="error">{state.message}</FormAlert>
          ) : null}

          <div>
            <label htmlFor="onboarding-display-name" className="ui-sm mb-1 block font-medium">
              Display name
            </label>
            <Input
              id="onboarding-display-name"
              name="displayName"
              defaultValue={initialDisplayName}
              maxLength={80}
              required
              autoComplete="nickname"
              aria-describedby="onboarding-display-name-errors"
              aria-invalid={Boolean(state.fieldErrors?.displayName)}
            />
            <FieldErrors
              id="onboarding-display-name-errors"
              errors={state.fieldErrors?.displayName}
            />
          </div>

          <div>
            <label htmlFor="onboarding-preferred-country" className="ui-sm mb-1 block font-medium">
              Which edition do you read most?
            </label>
            <select
              id="onboarding-preferred-country"
              name="preferredCountry"
              defaultValue={initialPreferredCountry || DEFAULT_COUNTRY}
              aria-describedby="onboarding-preferred-country-errors"
              aria-invalid={Boolean(state.fieldErrors?.preferredCountry)}
              className="ui-md h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <FieldErrors
              id="onboarding-preferred-country-errors"
              errors={state.fieldErrors?.preferredCountry}
            />
          </div>

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Start reading"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
