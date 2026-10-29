import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomeRail } from "@/components/home/home-rail";
import { ListingHeader, ListingLead, ListingRows } from "@/components/listing/story-listing";
import { Pagination } from "@/components/pagination";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { COUNTRIES } from "@/lib/countries";
import { getCategoryBySlug, isValidCountry, listPosts } from "@/lib/dal";
import { getHomeRailData } from "@/lib/dal/home-rail";

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
  const [result, rail] = await Promise.all([
    listPosts({ country: countryCode, categorySlug: slug, page, perPage: PER_PAGE }),
    getHomeRailData(countryCode),
  ]);
  const [leadPost, ...remainingPosts] = result.items;
  const editionName = COUNTRIES[countryCode].name;
  const basePath = `/${countryCode}/category/${slug}`;
  // The lead treatment is for the newest story; later pages are plain rows.
  const showLead = result.page === 1 && leadPost !== undefined;
  const rows = showLead ? remainingPosts : result.items;

  return (
    <Container className="pb-8 pt-5 md:py-8">
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
            total={result.total}
          />

          {result.items.length > 0 ? (
            <>
              {showLead ? <ListingLead post={leadPost} showCategory={false} /> : null}
              <ListingRows posts={rows} showCategory={false} />
              <Pagination basePath={basePath} page={result.page} totalPages={result.totalPages} />
            </>
          ) : (
            <p className="body-lg text-muted-foreground">No stories in this section yet.</p>
          )}
        </div>
      </RailLayout>
    </Container>
  );
}
