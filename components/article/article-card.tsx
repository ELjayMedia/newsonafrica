import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/lib/dal/types";

export type ArticleCardVariant = "grid" | "list" | "compact";

export interface ArticleCardProps {
  post: PostSummary;
  variant?: ArticleCardVariant;
  /** Marks the image `loading="eager"`/high `fetchPriority` for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

const IMAGE_ASPECT: Record<ArticleCardVariant, string> = {
  grid: "aspect-video",
  list: "aspect-[4/3]",
  compact: "aspect-video",
};

/**
 * Shared post preview card used by the home feed, category/tag/author
 * listings and the related-articles rail. `variant` controls layout:
 * `grid` (image above text), `list` (image beside text, for horizontal
 * rows), `compact` (small image, no excerpt).
 */
export function ArticleCard({ post, variant = "grid", priority = false, className }: ArticleCardProps) {
  const href = getArticleUrl(post.country, post.slug);
  const category = post.categories[0];
  const isList = variant === "list";

  return (
    <article className={cn("group flex h-full flex-col overflow-hidden", isList && "sm:flex-row", className)}>
      <Link
        href={href}
        className={cn(
          "relative block flex-shrink-0 overflow-hidden rounded-lg bg-muted",
          IMAGE_ASPECT[variant],
          isList && "sm:w-40 sm:flex-shrink-0 md:w-48",
        )}
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted images; see components/article/article-card.tsx header
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" aria-hidden />
        )}
      </Link>

      <div className={cn("flex flex-1 flex-col gap-2 pt-3", isList && "sm:pt-0 sm:pl-4")}>
        {category ? (
          <Link href={`/${post.country}/category/${category.slug}`} className="w-fit">
            <Badge variant="secondary">{category.name}</Badge>
          </Link>
        ) : null}

        <h3 className={cn("heading-sm", variant === "compact" && "text-sm font-semibold leading-snug")}>
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h3>

        {variant !== "compact" && post.excerpt ? (
          <p className="body-sm line-clamp-2 text-muted-foreground">{post.excerpt}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 ui-sm text-muted-foreground">
          {post.author ? <span>{post.author.name}</span> : null}
          {post.author ? <span aria-hidden>&middot;</span> : null}
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
      </div>
    </article>
  );
}
