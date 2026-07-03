"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/account/avatar-picker";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { updateProfileAction } from "@/lib/auth/profile";
import { initialAuthFormState } from "@/lib/auth/validation";
import { COUNTRY_LIST } from "@/lib/countries";

/** Profile settings form (NOA-99), driven by `updateProfileAction`. */
export function ProfileForm({
  userId,
  initialDisplayName,
  initialPreferredCountry,
  initialAvatarUrl,
}: {
  userId: string;
  initialDisplayName: string;
  initialPreferredCountry: string;
  initialAvatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialAuthFormState);
  const [displayName, setDisplayName] = React.useState(initialDisplayName);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>
          Your display name and avatar appear alongside your activity on News on Africa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}
          {state.status === "success" && state.message ? (
            <FormAlert tone="success">{state.message}</FormAlert>
          ) : null}

          <AvatarPicker userId={userId} displayName={displayName} initialAvatarUrl={initialAvatarUrl} />

          <div>
            <label htmlFor="profile-display-name" className="ui-sm mb-1 block font-medium">
              Display name
            </label>
            <Input
              id="profile-display-name"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              required
              autoComplete="nickname"
              aria-describedby="profile-display-name-errors"
              aria-invalid={Boolean(state.fieldErrors?.displayName)}
            />
            <FieldErrors id="profile-display-name-errors" errors={state.fieldErrors?.displayName} />
          </div>

          <div>
            <label htmlFor="profile-preferred-country" className="ui-sm mb-1 block font-medium">
              Preferred edition
            </label>
            <select
              id="profile-preferred-country"
              name="preferredCountry"
              defaultValue={initialPreferredCountry}
              aria-describedby="profile-preferred-country-errors"
              aria-invalid={Boolean(state.fieldErrors?.preferredCountry)}
              className="ui-md h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">No preference</option>
              {COUNTRY_LIST.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <FieldErrors id="profile-preferred-country-errors" errors={state.fieldErrors?.preferredCountry} />
            <p className="body-sm mt-1 text-muted-foreground">
              We&apos;ll open this edition by default when you visit.
            </p>
          </div>

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
