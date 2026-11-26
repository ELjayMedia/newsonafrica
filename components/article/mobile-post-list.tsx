import Link from "next/link";
import { StoryImage } from "@/components/story-image";

import { Badge } from "@/components/ui/badge";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/lib/dal/types";

export interface MobileFeatureStoryProps {
  post: PostSummary;
  eyebrow?: string;
  className?: string;
}

export interface MobilePostListProps {
  posts: PostSummary[];
  className?: string;
}

/**
 * Mobile-only lead story card for listing surfaces.
 * Uses existing semantic tokens only: card, border, foreground, muted, primary.
 */
export function MobileFeatureStory({
  post,
  eyebrow = "Top story",
  className,
}: MobileFeatureStoryProps) {
  const href = getArticleUrl(post.country, post.slug);
  const category = post.categories[0];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <Link href={href} className="group block">
        <div className="relative aspect-[16/11] overflow-hidden bg-muted">
          <StoryImage
            src={post.featuredImage?.url}
            alt={post.featuredImage?.alt || post.title}
            label={post.categories[0]?.name}
            size="lg"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 space-y-2 text-primary-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-sm rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
                {eyebrow}
              </span>
              {category ? (
                <span className="ui-sm rounded-full bg-background/90 px-2.5 py-1 text-foreground">
                  {category.name}
                </span>
              ) : null}
            </div>
            <h2 className="font-display text-2xl font-black leading-tight tracking-tight">
              {post.title}
            </h2>
            <p className="ui-sm text-primary-foreground/85">
              {post.author ? `${post.author.name} · ` : ""}
              {formatDate(post.publishedAt)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Mobile-only stacked story list with a compact, readable rhythm. */
export function MobilePostList({ posts, className }: MobilePostListProps) {
  if (posts.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {posts.map((post) => {
        const href = getArticleUrl(post.country, post.slug);
        const category = post.categories[0];

        return (
          <article
            key={`${post.country}-${post.id}`}
            className="border-b border-border last:border-b-0"
          >
            <Link
              href={href}
              className="grid grid-cols-[1fr_6.25rem] gap-3 p-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0 space-y-1.5">
                {category ? (
                  <Badge variant="secondary" className="w-fit">
                    {category.name}
                  </Badge>
                ) : null}
                <h3 className="heading-sm line-clamp-2 text-foreground">{post.title}</h3>
                {post.excerpt ? (
                  <p className="body-sm line-clamp-2 text-muted-foreground">{post.excerpt}</p>
                ) : null}
                <p className="ui-sm truncate text-muted-foreground">
                  {post.author ? `${post.author.name} · ` : ""}
                  {formatDate(post.publishedAt)}
                </p>
              </div>
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <StoryImage
                  src={post.featuredImage?.url}
                  alt={post.featuredImage?.alt || post.title}
                  label={post.categories[0]?.name}
                  size="sm"
                />
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
