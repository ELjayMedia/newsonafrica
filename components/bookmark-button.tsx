"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { toggleBookmarkAction } from "@/lib/bookmarks/actions";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { cn } from "@/lib/utils";

/**
 * Save/unsave toggle for the article page (NOA-100). Flips optimistically,
 * then reconciles with the server action's result — reverting (with a short
 * inline notice) if the write fails. Signed-out readers are sent to /login
 * with a return path back to the article.
 */
export function BookmarkButton({
  country,
  slug,
  wpPostId,
  initialBookmarked,
  signedIn,
  iconOnly = false,
  className,
}: {
  country: string;
  slug: string;
  wpPostId: number;
  initialBookmarked: boolean;
  signedIn: boolean;
  /** Round 44px icon button for the mobile article toolbar; the label stays in aria-label. */
  iconOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(getArticleUrl(country, slug))}`);
      return;
    }

    const next = !bookmarked;
    setBookmarked(next);
    setMessage(null);

    startTransition(async () => {
      const result = await toggleBookmarkAction({ country, wpPostId, slug, bookmarked: next });
      if (!result.ok) {
        setBookmarked(!next);
        if (result.requiresAuth) {
          router.push(`/login?next=${encodeURIComponent(getArticleUrl(country, slug))}`);
        } else {
          setMessage(result.message);
        }
      }
    });
  };

  return (
    <span className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Remove this article from your saved list" : "Save this article"}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-input text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-70",
          iconOnly ? "h-11 w-11" : "h-11 gap-1.5 px-4 ui-sm md:h-9 md:px-3",
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={iconOnly ? "h-5 w-5" : "h-4 w-4"}
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {iconOnly ? null : bookmarked ? "Saved" : "Save"}
      </button>
      {message ? (
        <span role="status" className="body-sm text-destructive">
          {message}
        </span>
      ) : null}
    </span>
  );
}
