import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { FeaturedHero } from "@/components/home/featured-hero";
import { NewsGrid } from "@/components/home/news-grid";
import { SecondaryStories } from "@/components/home/secondary-stories";
import { MostReadRail } from "@/components/home/most-read-rail";
import { RailLayout } from "@/components/ui/rail-layout";
import { getCountry, getHomeFeed, getMostReadPosts, isValidCountry, type HomeFeed, type MostReadPost } from "@/lib/dal";
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

// 1 hero + 3 secondary stories + 9 grid cards.
const HOME_POST_COUNT = 13;
const MOST_READ_COUNT = 6;

const log = createLogger("country-home-page");

async function loadCountryHomeData(countryCode: string): Promise<{ feed: HomeFeed; mostRead: MostReadPost[] }> {
  const [feedResult, mostReadResult] = await Promise.allSettled([
    // Editor-pinned (sticky) posts lead the feed, then the latest fill in.
    getHomeFeed(countryCode, { total: HOME_POST_COUNT, secondary: 3 }),
    getMostReadPosts(countryCode, MOST_READ_COUNT),
  ]);

  if (feedResult.status === "rejected") {
    log.warn("Country home feed unavailable", { country: countryCode, err: feedResult.reason });
  }

  if (mostReadResult.status === "rejected") {
    log.warn("Country home most-read feed unavailable", { country: countryCode, err: mostReadResult.reason });
  }

  return {
    feed: feedResult.status === "fulfilled" ? feedResult.value : { hero: null, secondary: [], grid: [] },
    mostRead: mostReadResult.status === "fulfilled" ? mostReadResult.value : [],
  };
}

export default async function CountryHomePage({ params }: CountryHomePageProps) {
  const { countryCode } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const { feed, mostRead } = await loadCountryHomeData(countryCode);
  const { hero, secondary, grid } = feed;

  return (
    <Container className="space-y-10 py-8">
      {hero ? (
        <div className="space-y-6">
          <FeaturedHero post={hero} />
          <SecondaryStories posts={secondary} />
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <h1 className="heading-lg">No stories available yet</h1>
          <p className="body-md mt-2 text-muted-foreground">
            We could not load this edition’s latest stories just now. Please check back shortly.
          </p>
        </section>
      )}

      <RailLayout rail={mostRead.length > 0 ? <MostReadRail posts={mostRead} /> : undefined}>
        <NewsGrid posts={grid} />
      </RailLayout>
    </Container>
  );
}
