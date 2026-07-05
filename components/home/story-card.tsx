import Link from "next/link";

import { getArticleUrl } from "@/lib/content-sync/article-url";
import { formatRelativeTime } from "@/lib/format";
import type { PostSummary } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

function CategoryEyebrow({ post }: { post: PostSummary }) {
  const category = post.categories[0];
  if (!category) return null;
  return (
    <Link
      href={`/${post.country}/category/${category.slug}`}
      className="noa-eyebrow w-fit text-noa-green hover:underline"
    >
      {category.name}
    </Link>
  );
}

function ImageFrame({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-noa-hairline", className)}>
      {post.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
        <img
          src={post.featuredImage.url}
          alt={post.featuredImage.alt || post.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden
          className="h-full w-full"
          style={{ background: "linear-gradient(135deg,#0b5e2d,#15994a)" }}
        />
      )}
    </div>
  );
}

/**
 * Standard story card (design system §04): image on top, green category
 * eyebrow, a heavy Archivo headline and a relative timestamp. Used for the two
 * stories beside the hero and any general card grid.
 */
export function StoryCard({ post }: { post: PostSummary }) {
  const href = getArticleUrl(post.country, post.slug);
  return (
    <article className="group flex flex-col gap-3">
      <Link href={href} className="block">
        <ImageFrame post={post} className="aspect-[16/10]" />
      </Link>
      <CategoryEyebrow post={post} />
      <h3 className="font-display text-lg font-extrabold leading-[1.08] tracking-[-0.01em] text-noa-ink">
        <Link href={href} className="transition-colors hover:text-noa-green">
          {post.title}
        </Link>
      </h3>
      <time dateTime={post.publishedAt} className="text-xs font-semibold text-noa-faint">
        {formatRelativeTime(post.publishedAt)}
      </time>
    </article>
  );
}

/**
 * Compact horizontal row: a small thumbnail beside a green eyebrow, a bold
 * headline and a timestamp. Used in the "Latest across the continent" grid and
 * the right-rail "Latest News" list.
 */
export function ThumbRow({
  post,
  showEyebrow = true,
}: {
  post: PostSummary;
  showEyebrow?: boolean;
}) {
  const href = getArticleUrl(post.country, post.slug);
  return (
    <article className="group flex items-start gap-3">
      <Link href={href} className="shrink-0">
        <ImageFrame post={post} className="h-16 w-16" />
      </Link>
      <div className="min-w-0 flex-1">
        {showEyebrow ? <CategoryEyebrow post={post} /> : null}
        <h3 className="mt-1 font-display text-[0.9375rem] font-bold leading-[1.12] tracking-[-0.01em] text-noa-ink">
          <Link href={href} className="transition-colors hover:text-noa-green">
            {post.title}
          </Link>
        </h3>
        <time
          dateTime={post.publishedAt}
          className="mt-1 block text-xs font-semibold text-noa-faint"
        >
          {formatRelativeTime(post.publishedAt)}
        </time>
      </div>
    </article>
  );
}

/**
 * Mobile feed row (News24-style): a square thumbnail on the left beside a
 * bordered category pill + relative time on one line and a large, heavy Archivo
 * headline below. This is the dominant unit of the mobile home feed — a dense,
 * scannable vertical list. Sits inside a `divide-y` list for hairline rules.
 */
export function FeedRow({ post }: { post: PostSummary }) {
  const href = getArticleUrl(post.country, post.slug);
  const category = post.categories[0];
  return (
    <article className="group flex gap-4 py-5">
      <Link href={href} className="shrink-0">
        <ImageFrame post={post} className="size-24" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2">
          {category ? (
            <Link
              href={`/${post.country}/category/${category.slug}`}
              className="truncate rounded-full border border-noa-hairline px-2.5 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-[0.06em] text-noa-ink transition-colors hover:border-noa-green hover:text-noa-green"
            >
              {category.name}
            </Link>
          ) : (
            <span aria-hidden />
          )}
          <time
            dateTime={post.publishedAt}
            className="ml-auto shrink-0 text-xs font-semibold text-noa-faint"
          >
            {formatRelativeTime(post.publishedAt)}
          </time>
        </div>
        <h3 className="font-display text-lg font-extrabold leading-[1.14] tracking-[-0.015em] text-noa-ink">
          <Link href={href} className="transition-colors hover:text-noa-green">
            {post.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}
