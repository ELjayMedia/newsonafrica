import Link from "next/link";
import { StoryImage } from "@/components/story-image";

import { StoryMeta } from "@/components/story-meta";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/lib/dal/types";

export type ArticleCardVariant = "grid" | "list" | "compact" | "feed" | "split";

export interface ArticleCardProps {
  post: PostSummary;
  variant?: ArticleCardVariant;
  /** Marks the image `loading="eager"`/high `fetchPriority` for above-the-fold cards. */
  priority?: boolean;
  /** Omit the section from the meta line, e.g. on a category page where every card shares it. */
  showCategory?: boolean;
  className?: string;
}

const IMAGE_ASPECT: Record<ArticleCardVariant, string> = {
  grid: "aspect-video",
  list: "aspect-[4/3]",
  compact: "aspect-video",
  feed: "aspect-[4/3] md:aspect-video",
  split: "aspect-[4/3] md:aspect-square",
};

/**
 * Shared post preview card used by the home feed, category/tag/author
 * listings and the related-articles rail. `variant` controls layout:
 * `grid` (image above text), `list` (thumbnail beside text at every width,
 * for stacked rows such as related stories), `compact` (small image, no
 * excerpt), `feed` (category feeds, News24-style: a thumbnail row on phones,
 * an image-on-top card from md up for the two-column grid; no excerpt).
 */
export function ArticleCard({
  post,
  variant = "grid",
  priority = false,
  showCategory = true,
  className,
}: ArticleCardProps) {
  const href = getArticleUrl(post.country, post.slug);
  const isList = variant === "list";
  const isFeed = variant === "feed";
  // Horizontal card in a two-column feed: square thumbnail on the left,
  // headline on the right, identical in both columns.
  const isSplit = variant === "split";

  return (
    <article
      className={cn(
        "group flex h-full overflow-hidden",
        isList || isSplit
          ? "flex-row gap-4"
          : isFeed
            ? "flex-row gap-4 md:flex-col md:gap-0"
            : "flex-col",
        className,
      )}
    >
      {/* Compact list rows go text-only when the story has no image. */}
      {(isList || isSplit) && !post.featuredImage ? null : (
        <Link
          href={href}
          className={cn(
            "relative block flex-shrink-0 overflow-hidden rounded-media bg-muted",
            IMAGE_ASPECT[variant],
            isList && "w-28 self-start sm:w-40",
            // Split feed: 90px square thumbnail from md up (phones unchanged).
            isSplit && "w-28 self-start sm:w-40 md:w-[90px]",
            isFeed && "w-28 self-start sm:w-40 md:w-full md:self-auto",
          )}
        >
          <StoryImage
            src={post.featuredImage?.url}
            alt={post.featuredImage?.alt || post.title}
            label={post.categories[0]?.name}
            size={isList || isSplit ? "sm" : "md"}
            priority={priority}
          />
        </Link>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2",
          isFeed ? "md:pt-3" : !isList && !isSplit && "pt-3",
        )}
      >
        {/* Headline first, details last (BBC-style): one card headline style
            everywhere, sized by variant; the section moves into the meta line. */}
        <h3
          className={cn(
            "story-hed",
            variant === "compact" && "text-[0.9375rem] lg:text-[1.0625rem]",
            variant === "list" && "text-[1.0625rem] sm:text-lg",
            variant === "feed" && "text-[1.0625rem] md:text-xl",
            // Split rows from md: text-lg (1.125rem) less 1/7 = 0.9643rem.
            isSplit && "text-[1.0625rem] md:text-[0.9643rem]",
            variant === "grid" && "text-lg",
          )}
        >
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h3>

        {variant !== "compact" && !isFeed && !isSplit && post.excerpt ? (
          <p
            className={cn("body-sm line-clamp-2 text-muted-foreground", isList && "max-sm:hidden")}
          >
            {post.excerpt}
          </p>
        ) : null}

        {/* Grids pin the meta line to the card foot so side-by-side cards
            align; rows keep it directly under the headline (BBC app). */}
        <StoryMeta
          post={post}
          showCategory={showCategory}
          className={cn(variant === "grid" && "mt-auto", isFeed && "md:mt-auto")}
        />
      </div>
    </article>
  );
}
