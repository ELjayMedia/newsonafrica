import { getSiteBaseUrl } from "@/lib/site-url";

import { HeroSection } from "./(home)/HeroSection";
import { LatestGridSection } from "./(home)/LatestGridSection";
import { TrendingSection } from "./(home)/TrendingSection";
import { fetchAggregatedHome, HOME_FEED_CACHE_TAGS } from "./(home)/home-data";

export const dynamic = "force-static";
export const revalidate = 60;

export default async function Page() {
  const baseUrl = getSiteBaseUrl();
  const aggregatedHome = await fetchAggregatedHome(baseUrl, HOME_FEED_CACHE_TAGS);

  return (
    <main className="container mx-auto space-y-12 px-4 py-8">
      <section>
        <HeroSection data={aggregatedHome} />
      </section>

      <section>
        <TrendingSection data={aggregatedHome} />
      </section>

      <section>
        <LatestGridSection data={aggregatedHome} />
      </section>
    </main>
  );
}
