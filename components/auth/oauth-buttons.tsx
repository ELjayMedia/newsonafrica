"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/form-alert";
import { signInWithGoogleAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/validation";

/**
 * Google OAuth hand-off (NOA-97). Always rendered; if the provider isn't
 * configured on the Supabase project the server action returns a friendly
 * error state instead of crashing, so the flow degrades gracefully.
 */
export function OAuthButtons({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInWithGoogleAction, initialAuthFormState);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="ui-sm text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Button type="submit" variant="outline" className="h-12 w-full rounded-xl md:h-10 md:rounded-full" disabled={pending}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.35c-.5 2.4-2.55 3.8-5.35 3.8a5.8 5.8 0 1 1 0-11.6c1.45 0 2.75.5 3.8 1.5l2.15-2.15A8.65 8.65 0 0 0 12 3.3a8.7 8.7 0 1 0 0 17.4c4.35 0 8.35-3.05 8.35-8.7 0-.3-.05-.6-.1-.9Z"
            />
          </svg>
          {pending ? "Redirecting to Google…" : "Continue with Google"}
        </Button>
      </form>

      {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}
    </div>
  );
}
