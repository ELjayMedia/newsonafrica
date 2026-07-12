"use client";

import { useActionState } from "react";

import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/auth/account-deletion-shared";
import { deleteAccountAction } from "@/lib/auth/account-deletion";
import { initialAuthFormState } from "@/lib/auth/validation";
import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialAuthFormState);
  const deleted = state.status === "success";

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete your News on Africa account and reader data? This cannot be undone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      <div>
        <label htmlFor="account-deletion-confirmation" className="ui-sm mb-1 block font-medium">
          Type {ACCOUNT_DELETION_CONFIRMATION} to confirm
        </label>
        <Input
          id="account-deletion-confirmation"
          name="confirmation"
          autoComplete="off"
          disabled={pending || deleted}
          aria-describedby="account-deletion-confirmation-errors"
          aria-invalid={Boolean(state.fieldErrors?.confirmation)}
        />
        <FieldErrors
          id="account-deletion-confirmation-errors"
          errors={state.fieldErrors?.confirmation}
        />
      </div>

      <Button
        type="submit"
        variant="destructive"
        disabled={pending || deleted}
        className="self-start"
      >
        {pending ? "Deleting account…" : "Delete my account"}
      </Button>
    </form>
  );
}
