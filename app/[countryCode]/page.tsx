import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/ad-slot";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { ExploreAfrica } from "@/components/home/explore-africa";
import { FeaturedTopStories } from "@/components/home/featured-top-stories";
import { HomeRail } from "@/components/home/home-rail";
import { MobileFeed } from "@/components/home/mobile-feed";
import { SponsoredCard } from "@/components/home/sponsored-card";
import { ListingRows } from "@/components/listing/story-listing";
import {
  getCountry,
  getHomeFeed,
  getMostReadPosts,
  isValidCountry,
  type HomeFeed,
  type MostReadPost,
} from "@/lib/dal";
import { initialFeedState, loadFeedPage } from "@/lib/feed/load";
import { createLogger } from "@/lib/log";

interface CountryHomePageProps {
  params: Promise<{ countryCode: string }>;
}

// Deliberately no `generateStaticParams` here: home feed content is
// time-sensitive (docs/caching-strategy.md), and every WordPress fetch below
// already carries its own tag + 60s revalidate via the DAL, so per-request
// dynamic rendering with a warm fetch cache serves this better than
// build-time static generation.

export async function generateMetadata({ params }: CountryHomePageProps): Promise<Metadata> {
  const { countryCode } = await params;
  const country = getCountry(countryCode);
  if (!country) return {};

  const title = `${country.name} News & Headlines`;

  return {
    title,
    description: `Top stories, politics, business and culture updates for ${country.name}, curated by News on Africa.`,
    alternates: { canonical: `/${country.code}` },
  };
}

// 1 hero + 3 secondary + 9 grid stories fill the hero, standard cards, the
// "Latest across" grid and the rail's Latest News list.
const HOME_POST_COUNT = 13;
const MOST_READ_COUNT = 6;

const log = createLogger("country-home-page");

async function loadCountryHomeData(
  countryCode: string,
): Promise<{ feed: HomeFeed; mostRead: MostReadPost[]; moreCursor: string | null }> {
  const scope = { kind: "edition", country: countryCode } as const;
  const [feedResult, mostReadResult, moreResult] = await Promise.allSettled([
    // Editor-pinned (sticky) posts lead the feed, then the latest fill in.
    getHomeFeed(countryCode, { total: HOME_POST_COUNT, secondary: 3 }),
    getMostReadPosts(countryCode, MOST_READ_COUNT),
    // Where "More stories" picks up: after the same number of latest posts.
    // Pinned posts shown above are de-duplicated by the feed itself.
    loadFeedPage(scope, initialFeedState(scope), HOME_POST_COUNT),
  ]);

  if (feedResult.status === "rejected") {
    log.warn("Country home feed unavailable", { country: countryCode, err: feedResult.reason });
  }

  if (mostReadResult.status === "rejected") {
    log.warn("Country home most-read feed unavailable", {
      country: countryCode,
      err: mostReadResult.reason,
    });
  }

  return {
    feed:
      feedResult.status === "fulfilled"
        ? feedResult.value
        : { hero: null, secondary: [], grid: [] },
    mostRead: mostReadResult.status === "fulfilled" ? mostReadResult.value : [],
    // Without a cursor the page simply ends where it did before.
    moreCursor: moreResult.status === "fulfilled" ? moreResult.value.nextCursor : null,
  };
}

export default async function CountryHomePage({ params }: CountryHomePageProps) {
  const { countryCode } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const { feed, mostRead, moreCursor } = await loadCountryHomeData(countryCode);
  const { hero, secondary, grid } = feed;

  // 13 stories: 1 lead + 4 beside it (top stories), 4 in the two-column
  // grid (even, so the feed continues it without a half-empty row) and 4 in
  // the rail's Latest news, so no story appears twice on the page.
  const rest = [...secondary, ...grid];
  const sideStories = rest.slice(0, 4);
  const latestGrid = rest.slice(4, 8);
  const railLatest = rest.slice(8, 12);
  // Mobile renders a single News24-style feed of every story instead.
  const allStories = [hero, ...secondary, ...grid].filter(
    (post): post is NonNullable<typeof post> => post != null,
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <AdSlot format="billboard" className="mb-8 hidden lg:block" />

      {hero ? (
        <>
          {/* One layout for every breakpoint: main column + rail (rail from
              lg). Desktop leads with the Yahoo-style top-stories module and a
              two-column "Latest stories" grid that the infinite feed
              continues; mobile keeps its own dense feed. */}
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <div className="min-w-0 lg:self-start lg:border lg:border-noa-hairline lg:bg-noa-white lg:p-6">
              <div className="hidden space-y-10 lg:block">
                <FeaturedTopStories lead={hero} side={sideStories} />
                <ExploreAfrica />
                <SponsoredCard />
                {latestGrid.length > 0 ? (
                  <section aria-labelledby="latest-stories-heading" className="space-y-6">
                    <h2 id="latest-stories-heading" className="section-title">
                      Latest stories
                    </h2>
                    <ListingRows posts={latestGrid} layout="split" />
                  </section>
                ) : null}
              </div>

              {/* Mobile: dense image-left feed. */}
              <MobileFeed posts={allStories} />

              {/* Infinite feed (one copy for every breakpoint): rows on phones,
                  continuing the two-column grid on desktop, where "Latest
                  stories" already heads it. */}
              <InfiniteFeed
                scope={{ scope: "edition", country: countryCode }}
                initialCursor={moreCursor}
                seenKeys={allStories.map((post) => `${post.country}-${post.id}`)}
                layout="split"
                adEvery={8}
                headingClassName="lg:sr-only"
                className="mt-10 lg:mt-6"
              />
            </div>

            <aside className="hidden min-w-0 lg:block">
              <HomeRail mostRead={mostRead} latest={railLatest} />
            </aside>
          </div>
        </>
      ) : (
        <section className="rounded-xl border border-noa-hairline bg-noa-paper p-6">
          <h1 className="font-display text-2xl font-black text-noa-ink">
            No stories available yet
          </h1>
          <p className="mt-2 text-noa-muted">
            We could not load this edition&rsquo;s latest stories just now. Please check back
            shortly.
          </p>
        </section>
      )}
    </div>
  );
}
