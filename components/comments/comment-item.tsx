"use client";

import * as React from "react";
import { useActionState } from "react";

import { FieldErrors, FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/comments/comment-form";
import { deleteCommentAction, updateCommentAction } from "@/lib/comments/actions";
import { COMMENT_MAX_LENGTH } from "@/lib/comments/validation";
import { initialAuthFormState } from "@/lib/auth/validation";
import type { CommentTreeItem } from "@/lib/dal/comments";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Visual indentation stops at this depth; deeper replies stay flush. */
const MAX_INDENT_DEPTH = 4;

const STATUS_NOTES: Partial<Record<CommentTreeItem["status"], string>> = {
  pending: "Awaiting review — only you can see this comment.",
  hidden: "Hidden by moderators — only you can see this comment.",
};

function EditCommentForm({
  comment,
  country,
  slug,
  onDone,
}: {
  comment: CommentTreeItem;
  country: string;
  slug: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateCommentAction, initialAuthFormState);

  React.useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to action results only
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.status === "error" && state.message ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <input type="hidden" name="commentId" value={comment.id} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">
          Edit your comment
        </label>
        <textarea
          id={`comment-edit-${comment.id}`}
          name="body"
          rows={3}
          required
          maxLength={COMMENT_MAX_LENGTH}
          defaultValue={comment.body}
          aria-describedby={`comment-edit-${comment.id}-errors`}
          aria-invalid={Boolean(state.fieldErrors?.body)}
          className="body-md w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <FieldErrors id={`comment-edit-${comment.id}-errors`} errors={state.fieldErrors?.body} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteCommentForm({
  commentId,
  country,
  slug,
}: {
  commentId: string;
  country: string;
  slug: string;
}) {
  const [state, formAction, pending] = useActionState(deleteCommentAction, initialAuthFormState);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start"
      onSubmit={(event) => {
        if (!window.confirm("Delete this comment? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="ui-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.status === "error" && state.message ? (
        <span role="alert" className="body-sm text-destructive">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

/**
 * One comment plus its nested replies (NOA-101). Authors get edit/delete on
 * their own comments; signed-in readers get reply. Deleted comments render
 * as neutral stubs so threads keep their shape.
 */
export function CommentItem({
  comment,
  country,
  slug,
  wpPostId,
  currentUserId,
  depth = 0,
}: {
  comment: CommentTreeItem;
  country: string;
  slug: string;
  wpPostId: number;
  currentUserId: string | null;
  depth?: number;
}) {
  const [replying, setReplying] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const isOwn = currentUserId !== null && currentUserId === comment.userId;
  const isDeleted = comment.status === "deleted";
  const authorName = comment.author?.displayName?.trim() || "Reader";
  const statusNote = isOwn ? STATUS_NOTES[comment.status] : undefined;

  return (
    <li
      className={cn(
        "flex flex-col gap-2",
        depth > 0 && depth <= MAX_INDENT_DEPTH && "border-l-2 border-border pl-4",
      )}
    >
      {isDeleted ? (
        <p className="body-sm italic text-muted-foreground">This comment was deleted.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {comment.author?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase-storage-hosted avatar
              <img src={comment.author.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ui-sm font-semibold text-muted-foreground"
              >
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="ui-sm font-semibold">{authorName}</span>
            <time dateTime={comment.createdAt} className="body-sm text-muted-foreground">
              {formatDate(comment.createdAt)}
            </time>
            {comment.editedAt ? <span className="body-sm text-muted-foreground">(edited)</span> : null}
          </div>

          {statusNote ? <p className="body-sm italic text-muted-foreground">{statusNote}</p> : null}

          {editing ? (
            <EditCommentForm comment={comment} country={country} slug={slug} onDone={() => setEditing(false)} />
          ) : (
            <p className="body-md whitespace-pre-line break-words text-foreground">{comment.body}</p>
          )}

          {!editing ? (
            <div className="flex items-center gap-3">
              {currentUserId ? (
                <button
                  type="button"
                  onClick={() => setReplying((value) => !value)}
                  className="ui-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {replying ? "Cancel reply" : "Reply"}
                </button>
              ) : null}
              {isOwn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="ui-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Edit
                  </button>
                  <DeleteCommentForm commentId={comment.id} country={country} slug={slug} />
                </>
              ) : null}
            </div>
          ) : null}

          {replying ? (
            <div className="mt-1">
              <CommentForm
                country={country}
                slug={slug}
                wpPostId={wpPostId}
                parentId={comment.id}
                autoFocus
                onPosted={() => setReplying(false)}
                onCancel={() => setReplying(false)}
              />
            </div>
          ) : null}
        </>
      )}

      {comment.replies.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              country={country}
              slug={slug}
              wpPostId={wpPostId}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
