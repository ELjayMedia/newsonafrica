import Link from "next/link";
import { StoryImage as Img } from "@/components/story-image";

import { heroFlag } from "@/components/home/hero-flag";
import { StoryMeta } from "@/components/story-meta";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import type { PostSummary } from "@/lib/dal/types";

function StoryImage({
  post,
  priority = false,
  className,
}: {
  post: PostSummary;
  priority?: boolean;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-media bg-noa-hairline ${className}`}>
      <Img
        src={post.featuredImage?.url}
        alt={priority ? post.featuredImage?.alt || post.title : ""}
        label={post.categories[0]?.name}
        size={priority ? "lg" : "md"}
        priority={priority}
        className="duration-500 group-hover:scale-[1.03]"
      />
    </div>
  );
}

/**
 * Desktop "Top stories" module: the lead story with its headline, summary
 * and meta on the left beside a large picture on the right, then the
 * secondary stories below as a row of vertical cards (image, headline,
 * meta). The lead headline is the page's <h1> on desktop.
 */
export function FeaturedTopStories({ lead, side }: { lead: PostSummary; side: PostSummary[] }) {
  const href = getArticleUrl(lead.country, lead.slug);
  const flag = heroFlag(lead);
  const category = lead.categories[0];

  return (
    <section aria-label="Top stories" className="space-y-6">
      <article className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {flag ? (
              <span className="inline-flex items-center gap-1.5 rounded bg-noa-live px-2 py-0.5 font-display text-[0.625rem] font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                {flag}
              </span>
            ) : null}
            {category ? (
              <Link
                href={`/${lead.country}/category/${category.slug}`}
                className="noa-eyebrow text-noa-green-text hover:underline"
              >
                {category.name}
              </Link>
            ) : null}
          </div>
          <h1 className="noa-hed text-[1.625rem] text-foreground">
            <Link href={href} className="transition-colors hover:text-primary">
              {lead.title}
            </Link>
          </h1>
          {lead.excerpt ? (
            <p className="body-lg line-clamp-4 text-muted-foreground">{lead.excerpt}</p>
          ) : null}
          <StoryMeta post={lead} showCategory={false} />
        </div>
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <StoryImage post={lead} priority className="aspect-[4/3]" />
        </Link>
      </article>

      {side.length > 0 ? (
        <ul className="grid grid-cols-4 gap-4 border-t border-border pt-6">
          {side.map((post) => {
            const sideHref = getArticleUrl(post.country, post.slug);
            return (
              <li key={`${post.country}-${post.id}`}>
                <article className="group flex h-full flex-col gap-2">
                  <Link href={sideHref} tabIndex={-1} aria-hidden className="block">
                    <StoryImage post={post} className="aspect-[16/10]" />
                  </Link>
                  <h2 className="story-hed line-clamp-3 text-[0.9375rem] lg:text-[1.0625rem]">
                    <Link href={sideHref} className="transition-colors hover:text-primary">
                      {post.title}
                    </Link>
                  </h2>
                  <StoryMeta post={post} className="mt-auto" />
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
