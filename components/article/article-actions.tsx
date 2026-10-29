import { ARTICLE_ICON_BUTTON, ShareMenuButton } from "@/components/article/share-menu-button";
import { BookmarkButton } from "@/components/bookmark-button";

export interface ArticleActionsProps {
  country: string;
  slug: string;
  wpPostId: number;
  title: string;
  /** Fully-qualified article URL to share. */
  shareUrl: string;
  bookmarked: boolean;
  signedIn: boolean;
}

/**
 * The article's three actions as one icon group: share (native sheet or a
 * target menu), save, and a jump to the comments. Sits in the publisher row
 * at every breakpoint.
 */
export function ArticleActions({
  country,
  slug,
  wpPostId,
  title,
  shareUrl,
  bookmarked,
  signedIn,
}: ArticleActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ShareMenuButton title={title} url={shareUrl} />
      <BookmarkButton
        country={country}
        slug={slug}
        wpPostId={wpPostId}
        initialBookmarked={bookmarked}
        signedIn={signedIn}
        iconOnly
      />
      <a href="#comments" aria-label="Go to comments" className={ARTICLE_ICON_BUTTON}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
      </a>
    </div>
  );
}
