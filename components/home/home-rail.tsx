import Link from "next/link";

import { AdSlot } from "@/components/ads/ad-slot";
import { ThumbRow } from "@/components/home/story-card";
import type { MostReadPost, PostSummary } from "@/lib/dal/types";
// Note: rank list links use MostReadPost.url; ThumbRow resolves its own hrefs.

/**
 * Numbered "Most Read" list (homepage mockup): oversized green Archivo rank
 * numbers beside tight headlines, under a green-underlined section heading.
 */
function MostRead({ posts }: { posts: MostReadPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-label="Most read" className="noa-panel p-5">
      <h2 className="section-title mb-4">Most read</h2>
      <ol className="space-y-4">
        {posts.map((post, index) => (
          <li key={post.id} className="flex items-start gap-3">
            <span className="heading-md font-display text-noa-green" aria-hidden>
              {index + 1}
            </span>
            <h3 className="story-hed text-[0.9375rem] lg:text-[1.0625rem]">
              <Link href={post.url} className="transition-colors hover:text-noa-green">
                {post.title}
              </Link>
            </h3>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * "Latest News" list (homepage mockup): thumbnail rows with a date, using the
 * shared ThumbRow row.
 */
function LatestNews({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-label="Latest news" className="noa-panel p-5">
      {/* No "Personalized for you" subhead: this is the edition's plain latest
          feed, and claiming personalisation it doesn't do costs trust. */}
      <h2 className="section-title mb-4">Latest news</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={`${post.country}-${post.id}`}
            className="border-b border-noa-hairline pb-4 last:border-0 last:pb-0"
          >
            <ThumbRow post={post} showEyebrow={false} />
          </div>
        ))}
      </div>
    </section>
  );
}

export interface HomeRailProps {
  mostRead: MostReadPost[];
  latest: PostSummary[];
}

/**
 * Right rail for the homepage: Most Read, a mid-rail MPU ad, a
 * Latest News list and a sticky half-page ad — the full monetised sidebar from
 * the design system homepage mockup.
 */
export function HomeRail({ mostRead, latest }: HomeRailProps) {
  return (
    // Rail sections are separate white panels; ad units sit on the grey
    // canvas between them (the rail only renders from lg up).
    <div className="space-y-6 lg:space-y-[12px]">
      <MostRead posts={mostRead} />
      <AdSlot placement="desktop-rail-mpu" />
      <LatestNews posts={latest} />
      <AdSlot placement="desktop-rail-halfpage" sticky />
    </div>
  );
}
