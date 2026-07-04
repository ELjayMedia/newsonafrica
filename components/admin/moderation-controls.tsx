"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/validation";
import { moderateCommentAction } from "@/lib/comments/admin-actions";
import type { CommentStatus } from "@/lib/supabase/types";

type ModerationIntent = "approve" | "hide" | "delete";

/**
 * Which moderation actions make sense from each status. Deleted comments
 * have their body cleared, so they can never be restored — no actions.
 */
const AVAILABLE_INTENTS: Record<CommentStatus, ModerationIntent[]> = {
  pending: ["approve", "hide", "delete"],
  approved: ["hide", "delete"],
  hidden: ["approve", "delete"],
  deleted: [],
};

const INTENT_LABELS: Record<ModerationIntent, { idle: string; pending: string }> = {
  approve: { idle: "Approve", pending: "Approving…" },
  hide: { idle: "Hide", pending: "Hiding…" },
  delete: { idle: "Delete", pending: "Deleting…" },
};

/**
 * Moderation action buttons for one comment (NOA-102). A single form posts
 * `moderateCommentAction` with the intent carried by the clicked submit
 * button; the admin page re-renders via revalidatePath on success.
 */
export function ModerationControls({ commentId, status }: { commentId: string; status: CommentStatus }) {
  const [state, formAction, pending] = useActionState(moderateCommentAction, initialAuthFormState);
  const intents = AVAILABLE_INTENTS[status];

  if (intents.length === 0) {
    return <p className="body-sm text-muted-foreground">Deleted comments cannot be restored.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <input type="hidden" name="commentId" value={commentId} />
      <div className="flex flex-wrap items-center gap-2">
        {intents.map((intent) => (
          <Button
            key={intent}
            type="submit"
            name="intent"
            value={intent}
            size="sm"
            variant={intent === "delete" ? "destructive" : intent === "approve" ? "default" : "outline"}
            disabled={pending}
          >
            {pending ? INTENT_LABELS[intent].pending : INTENT_LABELS[intent].idle}
          </Button>
        ))}
      </div>
    </form>
  );
}
