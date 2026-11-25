import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/ad-slot";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { ExploreAfrica } from "@/components/home/explore-africa";
import { FeaturedTopStories } from "@/components/home/featured-top-stories";
import { HomeRail } from "@/components/home/home-rail";
import { MobileFeed } from "@/components/home/mobile-feed";
import { SponsoredCard } from "@/components/home/sponsored-card";
import { ListingRows } from "@/components/listing/story-listing";
import { createLogger } from "@/lib/log";
import type { PostSummary } from "@/lib/dal";
import { initialFeedState, loadFeedPage } from "@/lib/feed/load";

// Canonical for the root page (NOA-114); resolved against metadataBase.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PAN_AFRICAN_POST_COUNT = 13;
const AFRICA_SCOPE = { kind: "africa" } as const;

const log = createLogger("home-page");

export default async function HomePage() {
  // Newest stories across every edition, merged by date. The same merged
  // feed continues below as infinite "More stories" from `moreCursor`.
  // Each edition degrades independently inside loadFeedPage.
  let posts: PostSummary[] = [];
  let moreCursor: string | null = null;
  try {
    const page = await loadFeedPage(
      AFRICA_SCOPE,
      initialFeedState(AFRICA_SCOPE),
      PAN_AFRICAN_POST_COUNT,
    );
    posts = page.posts;
    moreCursor = page.nextCursor;
  } catch (error) {
    log.warn("Pan-African home feed unavailable", { err: error });
  }

  // 13 stories: 1 lead + 4 beside it (top stories), 4 in the two-column
  // grid (even, so the feed continues it without a half-empty row) and 4 in
  // the rail's Latest news, so no story appears twice on the page.
  const [hero, ...rest] = posts;
  const sideStories = rest.slice(0, 4);
  const latestGrid = rest.slice(4, 8);
  const railLatest = rest.slice(8, 12);
  // Mobile renders a single News24-style feed of every story instead.
  const allStories = posts;

  return (
    <div className="px-4 py-6 sm:px-6 lg:pt-[12px]">
      <AdSlot format="billboard" className="mb-8 hidden lg:block" />

      {hero ? (
        <>
          {/* One layout for every breakpoint: main column + rail (rail from
              lg). Desktop leads with the Yahoo-style top-stories module and a
              two-column "Latest stories" grid that the infinite feed
              continues; mobile keeps its own dense feed. */}
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-[12px]">
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
                scope={{ scope: "africa" }}
                initialCursor={moreCursor}
                seenKeys={allStories.map((post) => `${post.country}-${post.id}`)}
                layout="split"
                adEvery={8}
                headingClassName="lg:sr-only"
                className="mt-10 lg:mt-6"
              />
            </div>

            <aside className="hidden min-w-0 lg:block">
              {/* Pan-African home has no per-edition Most Read RPC; the rail
                  leads with the Latest News list + house ads. */}
              <HomeRail mostRead={[]} latest={railLatest} />
            </aside>
          </div>
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
