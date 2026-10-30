"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ARTICLE_ICON_BUTTON } from "@/components/article/share-menu-button";
import { BrandMark } from "@/components/brand-mark";

export interface ArticleToolbarProps {
  /** Where "back" goes when the reader did not arrive from within the site. */
  fallbackHref: string;
  fallbackLabel: string;
}

/**
 * Mobile article toolbar (news-app pattern, cf. BBC / News24 apps): back and
 * the News On Africa mark, replacing the full masthead, utility bar and
 * section strip below md so the headline starts near the top of the first
 * screen. Share, save and comments live together in the article's action
 * row (ArticleActions) rather than being repeated here.
 */
export function ArticleToolbar({ fallbackHref, fallbackLabel }: ArticleToolbarProps) {
  const router = useRouter();

  const handleBack = () => {
    // Return to the previous page only when it was on this site; a reader
    // arriving from WhatsApp or search goes to the edition front instead.
    const cameFromSite = document.referrer.startsWith(window.location.origin);
    if (cameFromSite && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <div className="border-b border-border bg-background md:hidden">
      <div className="grid h-14 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label={`Back to ${fallbackLabel}`}
          className={ARTICLE_ICON_BUTTON}
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

        <Link href="/" aria-label="News On Africa home" className="justify-self-center">
          <BrandMark glyphSize={22} className="gap-2 [&_.noa-wordmark>span]:text-[1.05rem]" />
        </Link>

        {/* Empty third column keeps the mark optically centred. */}
        <span aria-hidden />
      </div>
    </div>
  );
}
