import Link from "next/link";

import { heroFlag } from "@/components/home/hero-lead";
import { StoryMeta } from "@/components/story-meta";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import type { PostSummary } from "@/lib/dal/types";

function LeadImage({ post }: { post: PostSummary }) {
  return post.featuredImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
    <img
      src={post.featuredImage.url}
      alt={post.featuredImage.alt || post.title}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  ) : (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: "linear-gradient(135deg,#0b5e2d,#15994a)" }}
    />
  );
}

/**
 * Desktop "Top stories" module (Yahoo-style): a large lead photo with the
 * headline, summary and meta overlaid on a dark gradient, beside a stacked
 * list of secondary stories (thumbnail + headline + meta). The lead headline
 * is the page's <h1> on desktop.
 */
export function FeaturedTopStories({ lead, side }: { lead: PostSummary; side: PostSummary[] }) {
  const href = getArticleUrl(lead.country, lead.slug);
  const flag = heroFlag(lead);
  const category = lead.categories[0];

  return (
    <section
      aria-label="Top stories"
      className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-6"
    >
      <article className="group relative min-h-[420px] overflow-hidden rounded-lg bg-noa-ink">
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0">
          <LeadImage post={lead} />
        </Link>
        {/* Scrim keeps overlaid text above 4.5:1 whatever the photo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-3 p-6">
          <div className="flex items-center gap-2">
            {flag ? (
              <span className="inline-flex items-center gap-1.5 rounded bg-noa-live px-2 py-0.5 font-display text-[0.625rem] font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                {flag}
              </span>
            ) : null}
            {category ? <span className="noa-eyebrow text-white/85">{category.name}</span> : null}
          </div>
          <h1 className="noa-hed text-[2rem] text-white">
            <Link href={href} className="pointer-events-auto hover:underline">
              {lead.title}
            </Link>
          </h1>
          {lead.excerpt ? (
            <p className="body-md line-clamp-2 max-w-[60ch] text-white/85">{lead.excerpt}</p>
          ) : null}
          <StoryMeta
            post={lead}
            showCategory={false}
            className="text-white/75 [&_time]:text-white/75"
          />
        </div>
      </article>

      <ul className="flex flex-col divide-y divide-border">
        {side.map((post) => {
          const sideHref = getArticleUrl(post.country, post.slug);
          return (
            <li key={`${post.country}-${post.id}`} className="py-3 first:pt-0 last:pb-0">
              <article className="group flex gap-3">
                <Link href={sideHref} className="shrink-0" tabIndex={-1} aria-hidden>
                  <div className="relative aspect-[4/3] w-28 overflow-hidden rounded-md bg-noa-hairline">
                    {post.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
                      <img
                        src={post.featuredImage.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </Link>
                <div className="min-w-0 space-y-1">
                  <h2 className="story-hed line-clamp-3 text-[0.9375rem]">
                    <Link href={sideHref} className="transition-colors hover:text-primary">
                      {post.title}
                    </Link>
                  </h2>
                  <StoryMeta post={post} />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
