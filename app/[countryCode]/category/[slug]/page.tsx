import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { HomeRail } from "@/components/home/home-rail";
import { ListingHeader, ListingLead, ListingRows } from "@/components/listing/story-listing";
import { Pagination } from "@/components/pagination";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { COUNTRIES } from "@/lib/countries";
import { getCategoryBySlug, isValidCountry, listPosts } from "@/lib/dal";
import { getHomeRailData } from "@/lib/dal/home-rail";
import { getSectionLead, leadWith } from "@/lib/dal/home";
import { initialFeedState, loadFeedPage } from "@/lib/feed/load";

interface CategoryPageProps {
  params: Promise<{ countryCode: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 12;

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { countryCode, slug } = await params;
  if (!isValidCountry(countryCode)) return {};

  const category = await getCategoryBySlug(countryCode, slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.description || `Latest ${category.name} stories.`,
    alternates: { canonical: `/${countryCode}/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { countryCode, slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const category = await getCategoryBySlug(countryCode, slug);
  if (!category) {
    notFound();
  }

  const page = Number(pageParam) || 1;
  const scope = { kind: "category", country: countryCode, slug } as const;
  // Page 1 comes from the cursor feed so infinite scroll can continue exactly
  // where it ends; ?page=N (N > 1) stays an offset-paged, crawlable page.
  const [listing, rail, sectionLead] = await Promise.all([
    page <= 1
      ? loadFeedPage(scope, initialFeedState(scope), PER_PAGE).then((feed) => ({
          items: feed.posts,
          page: 1,
          totalPages: feed.nextCursor ? 2 : 1,
          nextCursor: feed.nextCursor,
        }))
      : listPosts({ country: countryCode, categorySlug: slug, page, perPage: PER_PAGE }).then(
          (result) => ({ ...result, nextCursor: null }),
        ),
    getHomeRailData(countryCode),
    // The newsroom's ft pick leads page 1 of the section.
    page <= 1 ? getSectionLead(countryCode, slug) : Promise.resolve(null),
  ]);
  const firstPageItems = sectionLead
    ? leadWith([sectionLead], listing.items, listing.items.length + 1)
    : listing.items;
  const [leadPost, ...remainingPosts] = firstPageItems;
  const editionName = COUNTRIES[countryCode].name;
  const basePath = `/${countryCode}/category/${slug}`;
  const isFirstPage = listing.page === 1;
  // The lead treatment is for the ft pick (else the newest story); later
  // pages are plain rows.
  const showLead = isFirstPage && leadPost !== undefined;
  const rows = showLead ? remainingPosts : listing.items;

  return (
    <Container className="pb-8 pt-5 md:py-8 lg:pt-[12px]">
      {/* Desktop billboard under the header, on the grey canvas. */}
      {/* BreadcrumbList structured data (NOA-114). */}
      <BreadcrumbJsonLd
        items={[{ name: editionName, path: `/${countryCode}` }, { name: category.name }]}
      />

      {/* One responsive tree (previously separate mobile and desktop copies),
          in the article page's language: eyebrow + display headline, an
          edge-to-edge lead on phones, then thumbnail rows. Rail joins at lg. */}
      <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
        <div className="space-y-6 md:space-y-8">
          <ListingHeader
            eyebrow={{ label: editionName, href: `/${countryCode}` }}
            title={category.name}
            description={category.description || undefined}
            total={category.postCount}
          />

          {listing.items.length > 0 ? (
            <>
              {showLead ? <ListingLead post={leadPost} showCategory={false} /> : null}
              {isFirstPage ? (
                // Stories after the lead and every infinite-scroll page share
                // one list: thumbnail rows on phones, two cards per row from
                // md up (News24-style). ?page=2 stays as the crawlable / no-JS
                // next page until the feed hydrates.
                <InfiniteFeed
                  scope={{ scope: "category", country: countryCode, category: slug }}
                  initialCursor={listing.nextCursor}
                  initialItems={rows}
                  seenKeys={firstPageItems.map((post) => `${post.country}-${post.id}`)}
                  layout="grid"
                  adEvery={8}
                  heading={null}
                  showCategory={false}
                  fallbackHref={`${basePath}?page=2`}
                />
              ) : (
                <>
                  <ListingRows posts={rows} showCategory={false} layout="grid" />
                  <Pagination
                    basePath={basePath}
                    page={listing.page}
                    totalPages={listing.totalPages}
                  />
                </>
              )}
            </>
          ) : (
            <p className="body-lg text-muted-foreground">No stories in this section yet.</p>
          )}
        </div>
      </RailLayout>
    </Container>
  );
}
