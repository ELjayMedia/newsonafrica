import { AdSlot } from "@/components/ads/ad-slot";
import { ExploreAfrica } from "@/components/home/explore-africa";
import { FeedRow } from "@/components/home/story-card";
import { SponsoredCard } from "@/components/home/sponsored-card";
import type { PostSummary } from "@/lib/dal/types";

/**
 * Mobile home feed (News24-style): one dense, scannable column of image-left
 * story rows separated by hairlines, with a sponsored native unit and an MPU
 * ad woven into the flow and the country-edition chips at the foot. Renders
 * only below `lg` — desktop keeps the hero + grid + rail layout. Because both
 * trees reference the same post image URLs, rendering both costs no extra image
 * downloads (the browser dedupes by URL).
 */
export function MobileFeed({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null;

  const lead = posts.slice(0, 3);
  const middle = posts.slice(3, 6);
  const rest = posts.slice(6);

  return (
    <div className="lg:hidden">
      <div className="divide-y divide-noa-hairline border-t border-noa-hairline">
        {lead.map((post) => (
          <FeedRow key={`${post.country}-${post.id}`} post={post} />
        ))}
      </div>

      <div className="my-5">
        <SponsoredCard />
      </div>

      {middle.length > 0 ? (
        <div className="divide-y divide-noa-hairline border-t border-noa-hairline">
          {middle.map((post) => (
            <FeedRow key={`${post.country}-${post.id}`} post={post} />
          ))}
        </div>
      ) : null}

      <div className="my-6">
        <AdSlot format="mpu" />
      </div>

      {rest.length > 0 ? (
        <div className="divide-y divide-noa-hairline border-t border-noa-hairline">
          {rest.map((post) => (
            <FeedRow key={`${post.country}-${post.id}`} post={post} />
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <ExploreAfrica />
      </div>
    </div>
  );
}
