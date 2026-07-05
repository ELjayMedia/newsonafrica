import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/ad-slot";
import { ExploreAfrica } from "@/components/home/explore-africa";
import { HeroLead } from "@/components/home/hero-lead";
import { HomeRail } from "@/components/home/home-rail";
import { LatestAcross } from "@/components/home/latest-across";
import { MobileFeed } from "@/components/home/mobile-feed";
import { SponsoredCard } from "@/components/home/sponsored-card";
import { StoryCard } from "@/components/home/story-card";
import { createLogger } from "@/lib/log";
import { listCountries, listPosts, type Country, type PostSummary } from "@/lib/dal";

// Canonical for the root page (NOA-114); resolved against metadataBase.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PAN_AFRICAN_POSTS_PER_COUNTRY = 5;
const PAN_AFRICAN_POST_COUNT = 13;

const log = createLogger("home-page");

async function listPostsForCountry(
  country: Country,
): Promise<{ country: Country; posts: PostSummary[] }> {
  try {
    const { items } = await listPosts({
      country: country.code,
      perPage: PAN_AFRICAN_POSTS_PER_COUNTRY,
    });
    return { country, posts: items };
  } catch (error) {
    log.warn("Country feed unavailable on pan-African home", { country: country.code, err: error });
    return { country, posts: [] };
  }
}

function getPostSortTime(post: PostSummary): number {
  const timestamp = Date.parse(post.publishedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export default async function HomePage() {
  const countryFeeds = await Promise.all(
    listCountries().map((country) => listPostsForCountry(country)),
  );
  const posts = countryFeeds
    .flatMap(({ posts }) => posts)
    .sort((a, b) => getPostSortTime(b) - getPostSortTime(a))
    .slice(0, PAN_AFRICAN_POST_COUNT);

  const [hero, ...rest] = posts;
  const standardCards = rest.slice(0, 2);
  const pool = rest.slice(2);
  const latestAcross = pool.slice(0, 4);
  const railLatest = pool.slice(4, 8);
  // Mobile renders a single News24-style feed of every story instead.
  const allStories = posts;

  return (
    <div className="px-4 py-6 sm:px-6">
      <AdSlot format="billboard" className="mb-8" />

      {hero ? (
        <>
          {/* Desktop: hero + grid + rail (rendered first so smoke-test locators
              resolve to the visible desktop copy at wide viewports). */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <div className="min-w-0 space-y-10">
              <HeroLead post={hero} />

              {standardCards.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 border-t border-noa-hairline pt-8 sm:grid-cols-2">
                  {standardCards.map((post) => (
                    <StoryCard key={`${post.country}-${post.id}`} post={post} />
                  ))}
                </div>
              ) : null}

              <ExploreAfrica />
              <SponsoredCard />
              <LatestAcross posts={latestAcross} />
            </div>

            <aside className="min-w-0">
              {/* Pan-African home has no per-edition Most Read RPC; the rail
                  leads with the personalised Latest News list + house ads. */}
              <HomeRail mostRead={[]} latest={railLatest} />
            </aside>
          </div>

          {/* Mobile: dense image-left feed. */}
          <MobileFeed posts={allStories} />
        </>
      ) : (
        <section className="rounded-xl border border-noa-hairline bg-noa-paper p-6">
          <h1 className="font-display text-2xl font-black text-noa-ink">
            Stories are being prepared
          </h1>
          <p className="mt-2 text-noa-muted">
            We could not load the latest stories just now. Choose a country edition below or check
            back shortly.
          </p>
          <div className="mt-6">
            <ExploreAfrica />
          </div>
        </section>
      )}
    </div>
  );
}
