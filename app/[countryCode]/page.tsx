import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { FeaturedHero } from "@/components/home/featured-hero";
import { NewsGrid } from "@/components/home/news-grid";
import { SecondaryStories } from "@/components/home/secondary-stories";
import { MostReadRail } from "@/components/home/most-read-rail";
import { getCountry, getMostReadPosts, isValidCountry, listPosts } from "@/lib/dal";

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

export default async function CountryHomePage({ params }: CountryHomePageProps) {
  const { countryCode } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const [{ items: posts }, mostRead] = await Promise.all([
    listPosts({ country: countryCode, perPage: HOME_POST_COUNT }),
    getMostReadPosts(countryCode, MOST_READ_COUNT),
  ]);

  const [hero, ...rest] = posts;
  const secondary = rest.slice(0, 3);
  const grid = rest.slice(3);

  return (
    <Container className="space-y-10 py-8">
      {hero ? (
        <div className="space-y-6">
          <FeaturedHero post={hero} />
          <SecondaryStories posts={secondary} />
        </div>
      ) : (
        <p className="body-lg text-muted-foreground">No stories published yet for this edition.</p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NewsGrid posts={grid} />
        <MostReadRail posts={mostRead} />
      </div>
    </Container>
  );
}
