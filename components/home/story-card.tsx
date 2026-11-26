import Link from "next/link";
import { StoryImage } from "@/components/story-image";

import { getArticleUrl } from "@/lib/content-sync/article-url";
import { StoryMeta } from "@/components/story-meta";
import type { PostSummary } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

function ImageFrame({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-media bg-noa-hairline", className)}>
      <StoryImage
        src={post.featuredImage?.url}
        alt={post.featuredImage?.alt || post.title}
        label={post.categories[0]?.name}
        size="sm"
      />
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
      {/* Compact rows go text-only when the story has no image. */}
      {post.featuredImage ? (
        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
          <ImageFrame post={post} className="h-16 w-16" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="story-hed text-[0.9375rem] lg:text-[1.0625rem]">
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
      {post.featuredImage ? (
        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
          <ImageFrame post={post} className="size-24" />
        </Link>
      ) : null}
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
