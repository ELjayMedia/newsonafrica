import { ThumbRow } from "@/components/home/story-card";
import type { PostSummary } from "@/lib/dal/types";

/**
 * "Latest across the continent" (homepage mockup): a section heading over a
 * two-column grid of compact thumbnail rows. Fills the main column below the
 * hero and sponsored unit with the continued feed.
 */
export function LatestAcross({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <section>
      <h2 className="section-title mb-5">Latest across the continent</h2>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {posts.map((post) => (
          <ThumbRow key={`${post.country}-${post.id}`} post={post} />
        ))}
      </div>
    </section>
  );
}
