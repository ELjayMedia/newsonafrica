import Link from "next/link";

import { getArticleUrl } from "@/lib/content-sync/article-url";
import { StoryMeta } from "@/components/story-meta";
import type { PostSummary } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

function ImageFrame({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-media bg-noa-hairline", className)}>
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
 * Compact horizontal row: a small thumbnail beside the headline and the meta
 * line. Used in the "Latest across the continent" grid and the right-rail
 * "Latest news" list.
 */
export function ThumbRow({
  post,
  showEyebrow = true,
}: {
  post: PostSummary;
  /** Include the section in the meta line. */
  showEyebrow?: boolean;
}) {
  const href = getArticleUrl(post.country, post.slug);
  return (
    <article className="group flex items-start gap-3">
      <Link href={href} className="shrink-0">
        <ImageFrame post={post} className="h-16 w-16" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="story-hed text-[0.9375rem]">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <StoryMeta post={post} showCategory={showEyebrow} />
      </div>
    </article>
  );
}

/**
 * Mobile feed row: a square thumbnail beside the headline, with the meta line
 * at the foot (BBC app order: headline first, details last). The dominant
 * unit of the mobile home feed; sits inside a `divide-y` list.
 */
export function FeedRow({ post }: { post: PostSummary }) {
  const href = getArticleUrl(post.country, post.slug);
  return (
    <article className="group flex gap-4 py-5">
      <Link href={href} className="shrink-0">
        <ImageFrame post={post} className="size-24" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="story-hed text-[1.0625rem]">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <StoryMeta post={post} />
      </div>
    </article>
  );
}
