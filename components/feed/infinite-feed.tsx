"use client";

import * as React from "react";

import { AdSlot } from "@/components/ads/ad-slot";
import { ArticleCard } from "@/components/article/article-card";
import {
  STORY_LIST_CARD_VARIANT,
  STORY_LIST_CLASSES,
  type StoryListLayout,
} from "@/components/listing/story-listing";
import type { PostSummary } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

/** Pages loaded automatically on scroll before handing over to a button, so the footer stays reachable. */
const MAX_AUTO_LOADS = 3;
/** Start fetching while the sentinel is still this far below the viewport. */
const PREFETCH_MARGIN = "800px 0px";

export interface InfiniteFeedProps {
  /** Which feed /api/feed should page through. */
  scope:
    | { scope: "africa" }
    | { scope: "edition"; country: string }
    | { scope: "category"; country: string; category: string };
  /** Cursor for the page after the server-rendered stories; null = nothing more. */
  initialCursor: string | null;
  /** `${country}-${id}` keys already on the page, so the feed never repeats a story. */
  seenKeys: string[];
  /**
   * Server-rendered stories to start the list with, so they and the appended
   * pages form one continuous list/grid (no half-empty grid row between them).
   */
  initialItems?: PostSummary[];
  layout?: StoryListLayout;
  /**
   * Desktop leaderboard break after every N stories (grid layout). Only
   * rendered when ad inventory renders (commercial preview / live campaign),
   * so an unfilled slot never leaves an empty grid row.
   */
  adEvery?: number;
  /** Visible section heading; null continues the list above seamlessly (category pages). */
  heading?: string | null;
  /** Extra classes for the heading, e.g. visually hide it where a page heading already introduces the list. */
  headingClassName?: string;
  /** Show each card's category label (off on a category page, where it is the page). */
  showCategory?: boolean;
  /** Crawlable / no-JS next page (e.g. `?page=2`), shown until the feed hydrates. */
  fallbackHref?: string;
  className?: string;
}

type Status = "idle" | "loading" | "error";

const postKey = (post: PostSummary) => `${post.country}-${post.id}`;

/**
 * Infinite story feed (home and category pages). The first screen of stories
 * is server-rendered by the page; this appends thumbnail rows from
 * /api/feed as the reader nears the end, auto-loading a few pages and then
 * offering a "Load more stories" button. Progress is announced politely for
 * screen readers, and focus moves to the first new story when the button is
 * used.
 */
export function InfiniteFeed({
  scope,
  initialCursor,
  seenKeys,
  initialItems = [],
  layout = "rows",
  adEvery,
  heading = "More stories",
  headingClassName,
  showCategory = true,
  fallbackHref,
  className,
}: InfiniteFeedProps) {
  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState<PostSummary[]>(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [status, setStatus] = React.useState<Status>("idle");
  const [autoLoads, setAutoLoads] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");

  const seen = React.useRef(new Set([...seenKeys, ...initialItems.map(postKey)]));
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const focusIndex = React.useRef<number | null>(null);

  React.useEffect(() => setMounted(true), []);

  const load = React.useCallback(
    async (trigger: "auto" | "button") => {
      if (!cursor || status === "loading") return;
      setStatus("loading");

      const params = new URLSearchParams({ ...scope, cursor });
      try {
        const response = await fetch(`/api/feed?${params.toString()}`);
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        const page = (await response.json()) as { posts: PostSummary[]; nextCursor: string | null };

        const fresh = page.posts.filter((post) => !seen.current.has(postKey(post)));
        fresh.forEach((post) => seen.current.add(postKey(post)));

        if (trigger === "button" && fresh.length > 0) focusIndex.current = items.length;
        setItems((current) => [...current, ...fresh]);
        setCursor(page.nextCursor);
        // A page with nothing new hands over to the button rather than looping.
        setAutoLoads((count) =>
          trigger === "auto" && fresh.length > 0 ? count + 1 : MAX_AUTO_LOADS,
        );
        setAnnouncement(
          page.nextCursor
            ? `Loaded ${fresh.length} more ${fresh.length === 1 ? "story" : "stories"}.`
            : "You're all caught up.",
        );
        setStatus("idle");
      } catch {
        setStatus("error");
        setAnnouncement("Couldn't load more stories.");
      }
    },
    [cursor, items.length, scope, status],
  );

  // Auto-load while the sentinel approaches the viewport, up to MAX_AUTO_LOADS pages.
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor || status !== "idle" || autoLoads >= MAX_AUTO_LOADS) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load("auto");
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoads, cursor, load, status]);

  // After a button load, move focus to the first new story's headline link.
  React.useEffect(() => {
    if (focusIndex.current === null) return;
    const link =
      listRef.current?.children[focusIndex.current]?.querySelector<HTMLAnchorElement>("h3 a");
    focusIndex.current = null;
    link?.focus();
  }, [items]);

  const showButton =
    mounted &&
    cursor !== null &&
    status === "idle" &&
    (autoLoads >= MAX_AUTO_LOADS || typeof IntersectionObserver === "undefined");

  if (!initialCursor && items.length === 0) return null;

  return (
    <section
      aria-labelledby={heading && items.length > 0 ? "more-stories-heading" : undefined}
      aria-label={heading && items.length > 0 ? undefined : (heading ?? "More stories")}
      className={cn(heading ? "space-y-4" : "space-y-2", className)}
    >
      {/* The heading waits for stories, so it never sits over an empty gap. */}
      {heading && items.length > 0 ? (
        <h2 id="more-stories-heading" className={cn("section-title", headingClassName)}>
          {heading}
        </h2>
      ) : null}

      {items.length > 0 ? (
        <ul
          ref={listRef}
          className={cn(
            STORY_LIST_CLASSES[layout].list,
            // Under a heading the first row needs no top rule.
            heading && "border-t-0",
          )}
        >
          {items.map((post, index) => (
            <React.Fragment key={postKey(post)}>
              <li className={cn(STORY_LIST_CLASSES[layout].item, heading && "first:pt-0")}>
                <ArticleCard
                  post={post}
                  variant={STORY_LIST_CARD_VARIANT[layout]}
                  showCategory={showCategory}
                />
              </li>
              {/* The ad row only takes a grid row / divider once its zone has a creative. */}
              {adEvery && (index + 1) % adEvery === 0 ? (
                <li className="hidden lg:col-span-2 lg:has-[[data-ad-filled=true]]:block">
                  <AdSlot placement="desktop-infeed-mpu" className="py-4" />
                </li>
              ) : null}
            </React.Fragment>
          ))}
        </ul>
      ) : null}

      <div ref={sentinelRef} aria-hidden className="h-px" />

      <div className="flex min-h-11 flex-col items-center justify-center gap-2 text-center">
        {status === "loading" ? (
          <p className="ui-sm text-muted-foreground" aria-hidden>
            Loading more stories…
          </p>
        ) : null}

        {status === "error" ? (
          <button
            type="button"
            onClick={() => void load("button")}
            className="ui-md inline-flex h-11 items-center rounded-full border border-input px-5 text-foreground hover:bg-accent md:h-10"
          >
            Couldn&rsquo;t load stories. Try again
          </button>
        ) : null}

        {showButton ? (
          <button
            type="button"
            onClick={() => void load("button")}
            className="ui-md inline-flex h-11 items-center rounded-full border border-input px-5 font-semibold text-foreground hover:bg-accent md:h-10"
          >
            Load more stories
          </button>
        ) : null}

        {/* Before hydration (or without JS) the next page stays a real link. */}
        {!mounted && fallbackHref && cursor ? (
          <a
            href={fallbackHref}
            className="ui-md inline-flex h-11 items-center rounded-full border border-input px-5 font-semibold text-foreground md:h-10"
          >
            More stories
          </a>
        ) : null}

        {mounted && cursor === null && items.length > 0 ? (
          <p className="ui-sm text-muted-foreground">You&rsquo;re all caught up.</p>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
