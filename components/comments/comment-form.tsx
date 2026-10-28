"use client";

import * as React from "react";
import { useActionState } from "react";

import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { postCommentAction } from "@/lib/comments/actions";
import { COMMENT_MAX_LENGTH } from "@/lib/comments/validation";
import { initialAuthFormState } from "@/lib/auth/validation";

/**
 * Comment / reply form (NOA-101), driven by `postCommentAction` via
 * useActionState per the auth-form conventions. React 19 resets the
 * uncontrolled textarea after a successful action; `onPosted` lets a reply
 * box close itself once its comment lands.
 */
export function CommentForm({
  country,
  slug,
  wpPostId,
  parentId,
  autoFocus = false,
  onPosted,
  onCancel,
}: {
  country: string;
  slug: string;
  wpPostId: number;
  parentId?: string;
  autoFocus?: boolean;
  onPosted?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(postCommentAction, initialAuthFormState);
  const isReply = Boolean(parentId);
  const fieldId = isReply ? `comment-reply-${parentId}` : "comment-body";

  React.useEffect(() => {
    if (state.status === "success") {
      onPosted?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to action results only
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}
      {!isReply && state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="wpPostId" value={wpPostId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}

      <div>
        <label htmlFor={fieldId} className="sr-only">
          {isReply ? "Your reply" : "Your comment"}
        </label>
        <textarea
          id={fieldId}
          name="body"
          rows={isReply ? 3 : 4}
          required
          maxLength={COMMENT_MAX_LENGTH}
          autoFocus={autoFocus}
          placeholder={isReply ? "Write a reply…" : "Share your thoughts…"}
          aria-describedby={`${fieldId}-errors`}
          aria-invalid={Boolean(state.fieldErrors?.body)}
          className="body-md w-full rounded-md max-md:text-base border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <FieldErrors id={`${fieldId}-errors`} errors={state.fieldErrors?.body} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : isReply ? "Post reply" : "Post comment"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
