import { FeaturedHero } from "@/components/FeaturedHero"
import { SecondaryStories } from "@/components/SecondaryStories"
import { NewsGrid } from "@/components/NewsGrid"
import type { AggregatedHomeData } from "@/lib/wordpress-api"

export function AfricanHomeContent({
  heroPost,
  secondaryPosts,
  remainingPosts,
}: AggregatedHomeData) {
  const hasHero = Boolean(heroPost)
  const hasSecondary = secondaryPosts.length > 0
  const hasRemaining = remainingPosts.length > 0

  if (!hasHero && !hasSecondary && !hasRemaining) {
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {hasHero && heroPost && (
        <section aria-label="Top story">
          <FeaturedHero post={heroPost} />
        </section>
      )}

      {hasSecondary && (
        <section aria-label="More top stories">
          <SecondaryStories posts={secondaryPosts} layout="horizontal" />
        </section>
      )}

      {hasRemaining && (
        <section aria-label="Latest from across Africa">
          <NewsGrid posts={remainingPosts} className="pt-2" />
        </section>
      )}
    </div>
  )
}
