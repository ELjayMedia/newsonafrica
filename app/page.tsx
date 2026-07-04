import type { Metadata } from "next";
import Link from "next/link";

import { FeaturedHero } from "@/components/home/featured-hero";
import { NewsGrid } from "@/components/home/news-grid";
import { SecondaryStories } from "@/components/home/secondary-stories";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { createLogger } from "@/lib/log";
import { listCountries, listPosts, type Country, type PostSummary } from "@/lib/dal";

// Canonical for the root page (NOA-114); resolved against metadataBase.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PAN_AFRICAN_POSTS_PER_COUNTRY = 5;
const PAN_AFRICAN_POST_COUNT = 13;

const log = createLogger("home-page");

async function listPostsForCountry(country: Country): Promise<{ country: Country; posts: PostSummary[] }> {
  try {
    const { items } = await listPosts({ country: country.code, perPage: PAN_AFRICAN_POSTS_PER_COUNTRY });
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
  const countryFeeds = await Promise.all(listCountries().map((country) => listPostsForCountry(country)));
  const posts = countryFeeds
    .flatMap(({ posts }) => posts)
    .sort((a, b) => getPostSortTime(b) - getPostSortTime(a))
    .slice(0, PAN_AFRICAN_POST_COUNT);

  const [hero, ...rest] = posts;
  const secondary = rest.slice(0, 3);
  const grid = rest.slice(3);

  return (
    <Container className="space-y-10 py-8">
      <section className="space-y-3">
        <p className="ui-sm uppercase tracking-wide text-primary">Pan-African edition</p>
        <h1 className="display-lg">News on Africa</h1>
        <p className="body-lg max-w-3xl text-muted-foreground">
          Top stories from across the continent, with local editions for every supported country.
        </p>
      </section>

      {hero ? (
        <div className="space-y-6">
          <FeaturedHero post={hero} />
          <SecondaryStories posts={secondary} />
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="heading-sm">Stories are being prepared</h2>
          <p className="body-md mt-2 text-muted-foreground">
            We could not load the latest stories just now. Choose a country edition below or check back shortly.
          </p>
        </section>
      )}

      <RailLayout
        rail={
          <div aria-label="Country editions" className="space-y-4">
            <h2 className="heading-sm border-b-2 border-primary pb-2">Editions</h2>
            <ul className="space-y-3">
              {countryFeeds.map(({ country, posts }) => (
                <li key={country.code}>
                  <Link
                    href={`/${country.code}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary hover:bg-muted/40"
                  >
                    <span className="ui-md font-medium">{country.name}</span>
                    <span className="ui-sm text-muted-foreground">
                      {posts.length > 0 ? `${posts.length} stories` : "Open edition"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <NewsGrid posts={grid} />
      </RailLayout>
    </Container>
  );
}
