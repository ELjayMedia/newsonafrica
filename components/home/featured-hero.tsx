import Link from "next/link";
import { StoryImage } from "@/components/story-image";

import { Badge } from "@/components/ui/badge";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/dal/types";

export interface FeaturedHeroProps {
  post: PostSummary;
}

/** Top-story hero for the country home page (NOA-89): large image + headline. */
export function FeaturedHero({ post }: FeaturedHeroProps) {
  const href = getArticleUrl(post.country, post.slug);
  const category = post.categories[0];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <Link
        href={href}
        className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-muted md:aspect-auto md:h-full"
      >
        <StoryImage
          src={post.featuredImage?.url}
          alt={post.featuredImage?.alt || post.title}
          label={post.categories[0]?.name}
          size="lg"
          priority
        />
      </Link>

      <div className="flex flex-col justify-center gap-3">
        {category ? (
          <Link href={`/${post.country}/category/${category.slug}`} className="w-fit">
            <Badge>{category.name}</Badge>
          </Link>
        ) : null}

        <h1 className="display-lg">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h1>

        {post.excerpt ? (
          <p className="body-lg line-clamp-3 text-muted-foreground">{post.excerpt}</p>
        ) : null}

        <div className="flex items-center gap-2 ui-sm text-muted-foreground">
          {post.author ? <span>{post.author.name}</span> : null}
          {post.author ? <span aria-hidden>&middot;</span> : null}
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
      </div>
    </div>
  );
}
