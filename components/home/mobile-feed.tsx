import { Fragment } from "react";

import { ExploreAfrica } from "@/components/home/explore-africa";
import { FeedRow } from "@/components/home/story-card";
import { SponsoredCard } from "@/components/home/sponsored-card";
import type { PostSummary } from "@/lib/dal/types";

const FIRST_NATIVE_AD_AFTER_STORIES = 4;
const SECOND_NATIVE_AD_AFTER_STORIES = 11;
const MIN_STORIES_FOR_SECOND_NATIVE_AD = 14;

function shouldRenderNativeAdAfter(index: number, totalStories: number): boolean {
  const storyNumber = index + 1;

  if (storyNumber === FIRST_NATIVE_AD_AFTER_STORIES) return true;

  return storyNumber === SECOND_NATIVE_AD_AFTER_STORIES && totalStories >= MIN_STORIES_FOR_SECOND_NATIVE_AD;
}

/**
 * Mobile home feed (News24-style): one dense, scannable column of image-left
 * story rows separated by hairlines, with clearly-labelled native sponsorships
 * woven into the flow only after the reader has seen real editorial content.
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
  if (posts.length === 0) return null;

  return (
    <div className="lg:hidden">
      <div className="divide-y divide-noa-hairline border-t border-noa-hairline">
        {posts.map((post, index) => (
          <Fragment key={`${post.country}-${post.id}`}>
            <FeedRow post={post} />
            {shouldRenderNativeAdAfter(index, posts.length) ? (
              <div className="py-5">
                <SponsoredCard
                  advertiser="News On Africa Partner"
                  headline="Useful business insight for readers moving Africa forward."
                  disclosure="Clearly marked sponsored story"
                />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="mt-8">
        <ExploreAfrica />
      </div>
    </div>
  );
}
