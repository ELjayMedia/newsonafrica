"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { removeBookmarkAction } from "@/lib/bookmarks/actions";

/**
 * Remove control for a saved article (NOA-19). Calls the server action in a
 * transition so the row shows a pending state, and surfaces a friendly inline
 * message if the delete fails (the revalidated list drops the row on success).
 */
export function RemoveBookmarkButton({ bookmarkId, title }: { bookmarkId: string; title: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeBookmarkAction(bookmarkId);
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 self-start">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={pending}
        aria-label={`Remove ${title} from saved articles`}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
      {error ? (
        <span role="status" className="body-sm text-right text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
