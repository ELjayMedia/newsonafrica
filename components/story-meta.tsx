import Link from "next/link";

import { formatRelativeTime } from "@/lib/format";
import type { PostSummary } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

export interface StoryMetaProps {
  post: PostSummary;
  /** Append the post's section ("4 hours ago | Business"). */
  showCategory?: boolean;
  className?: string;
}

/**
 * The metadata line at the foot of every story card (BBC-style): relative
 * time within a day, then the date, followed by the section as a plain text
 * link. Headline first, details last, one consistent muted line.
 */
export function StoryMeta({ post, showCategory = true, className }: StoryMetaProps) {
  const category = showCategory ? post.categories[0] : undefined;

  return (
    <p className={cn("story-meta flex flex-wrap items-center gap-x-2", className)}>
      {/* Relative time can differ by a minute between server and browser. */}
      <time dateTime={post.publishedAt} suppressHydrationWarning>
        {formatRelativeTime(post.publishedAt)}
      </time>
      {category ? (
        <>
          <span aria-hidden className="h-3 w-px bg-border" />
          <Link
            href={`/${post.country}/category/${category.slug}`}
            className="hover:text-foreground hover:underline"
          >
            {category.name}
          </Link>
        </>
      ) : null}
    </p>
  );
}
