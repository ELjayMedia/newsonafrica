"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookmarkButton } from "@/components/bookmark-button";
import { BrandMark } from "@/components/brand-mark";

const ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-input text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export interface ArticleToolbarProps {
  country: string;
  slug: string;
  wpPostId: number;
  title: string;
  /** Fully-qualified article URL to share. */
  shareUrl: string;
  /** Where "back" goes when the reader did not arrive from within the site. */
  fallbackHref: string;
  fallbackLabel: string;
  bookmarked: boolean;
  signedIn: boolean;
}

/**
 * Mobile article toolbar (news-app pattern, cf. BBC / News24 apps): back,
 * the News On Africa mark, save and share, replacing the full masthead,
 * utility bar and section strip below md so the headline starts near the
 * top of the first screen. Share uses the native share sheet (WhatsApp,
 * Telegram, etc.) where available and falls back to copying the link.
 */
export function ArticleToolbar({
  country,
  slug,
  wpPostId,
  title,
  shareUrl,
  fallbackHref,
  fallbackLabel,
  bookmarked,
  signedIn,
}: ArticleToolbarProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState("");

  const handleBack = () => {
    // Return to the previous page only when it was on this site; a reader
    // arriving from WhatsApp or search goes to the edition front instead.
    const cameFromSite = document.referrer.startsWith(window.location.origin);
    if (cameFromSite && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  const handleShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // Reader dismissed the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied");
      window.setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("");
    }
  };

  return (
    <div className="border-b border-border bg-background md:hidden">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label={`Back to ${fallbackLabel}`}
          className={ICON_BUTTON}
        >
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <Link href="/" aria-label="News On Africa home">
          <BrandMark glyphSize={22} className="gap-2 [&_.noa-wordmark>span]:text-[1.05rem]" />
        </Link>

        <div className="flex items-center gap-2">
          <BookmarkButton
            country={country}
            slug={slug}
            wpPostId={wpPostId}
            initialBookmarked={bookmarked}
            signedIn={signedIn}
            iconOnly
          />
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this article"
            className={ICON_BUTTON}
          >
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
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
