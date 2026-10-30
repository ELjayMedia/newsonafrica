import { Fragment } from "react";
import Link from "next/link";

import { ExploreAfrica } from "@/components/home/explore-africa";
import { heroFlag } from "@/components/home/hero-lead";
import { FeedRow } from "@/components/home/story-card";
import { StoryMeta } from "@/components/story-meta";
import { SponsoredCard } from "@/components/home/sponsored-card";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import type { PostSummary } from "@/lib/dal/types";

const FIRST_NATIVE_AD_AFTER_STORIES = 4;
const SECOND_NATIVE_AD_AFTER_STORIES = 11;
const MIN_STORIES_FOR_SECOND_NATIVE_AD = 14;

function shouldRenderNativeAdAfter(storyNumber: number, totalStories: number): boolean {
  if (storyNumber === FIRST_NATIVE_AD_AFTER_STORIES) return true;

  return (
    storyNumber === SECOND_NATIVE_AD_AFTER_STORIES &&
    totalStories >= MIN_STORIES_FOR_SECOND_NATIVE_AD
  );
}

function MobileLeadStory({ post }: { post: PostSummary }) {
  const href = getArticleUrl(post.country, post.slug);
  const flag = heroFlag(post);

  return (
    <article className="space-y-4 py-5">
      <Link
        href={href}
        className="group relative block aspect-[16/10] overflow-hidden rounded-xl bg-noa-hairline"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            loading="eager"
            fetchPriority="high"
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
      </Link>

      {/* BBC app order: optional LIVE flag, headline, then the meta line. The
          flag is text (not over the image) so it survives image-off loads. */}
      <div className="space-y-2.5">
        {flag ? (
          <span className="inline-flex items-center gap-1.5 rounded bg-noa-live px-2 py-0.5 font-display text-[0.625rem] font-black uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            {flag}
          </span>
        ) : null}

        <h2 className="noa-hed text-2xl text-foreground">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h2>

        <StoryMeta post={post} />
      </div>
    </article>
  );
}

/**
 * Mobile home feed: a strong lead story followed by dense image-left rows,
 * with clearly-labelled native sponsorships woven into the flow only after
 * the reader has seen real editorial content.
 *
 * Mobile ad policy:
 * - no billboard/prestitial before content;
 * - first native sponsorship only after four stories;
 * - second native sponsorship only on deeper feeds;
 * - no boxy MPU inside the mobile feed, keeping density below the 30% ceiling.
 *
 * Renders only below `lg` — desktop keeps the hero + grid + rail layout. Because
 * both trees reference the same post image URLs, rendering both costs no extra
 * image downloads (the browser dedupes by URL).
 */
export function MobileFeed({ posts }: { posts: PostSummary[] }) {
  const [lead, ...remainingPosts] = posts;
  if (!lead) return null;

  return (
    <div className="lg:hidden">
      {/* The desktop hero's <h1> is display:none below lg; give mobile screen
          reader users a page heading (this whole tree is hidden from lg up). */}
      <h1 className="sr-only">Latest news</h1>
      <div className="border-t border-noa-hairline">
        <MobileLeadStory post={lead} />

        {remainingPosts.length > 0 ? (
          <div className="divide-y divide-noa-hairline border-t border-noa-hairline">
            {remainingPosts.map((post, index) => {
              const storyNumber = index + 2;

              return (
                <Fragment key={`${post.country}-${post.id}`}>
                  <FeedRow post={post} />
                  {shouldRenderNativeAdAfter(storyNumber, posts.length) ? (
                    <div className="py-5">
                      <SponsoredCard
                        advertiser="News On Africa Partner"
                        headline="Useful business insight for readers moving Africa forward."
                        disclosure="Clearly marked sponsored story"
                      />
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-10">
        <ExploreAfrica />
      </div>
    </div>
  );
}
