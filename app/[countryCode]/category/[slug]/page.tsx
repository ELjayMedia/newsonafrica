import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileFeatureStory, MobilePostList } from "@/components/article/mobile-post-list";
import { HomeRail } from "@/components/home/home-rail";
import { NewsGrid } from "@/components/home/news-grid";
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
  const [featuredPost, ...remainingPosts] = result.items;

  return (
    <Container className="space-y-8 py-8 max-md:space-y-5 max-md:px-4 max-md:py-4">
      {/* BreadcrumbList structured data (NOA-114). */}
      <BreadcrumbJsonLd
        items={[{ name: COUNTRIES[countryCode].name, path: `/${countryCode}` }, { name: category.name }]}
      />
      <header className="space-y-2 border-b border-border pb-6 max-md:rounded-2xl max-md:border max-md:bg-card max-md:p-5 max-md:shadow-sm">
        <p className="ui-sm uppercase tracking-wide text-primary">Category</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="display-lg max-md:text-4xl">{category.name}</h1>
          <span className="hidden ui-sm rounded-full bg-primary/10 px-3 py-1 text-primary max-md:inline-flex">
            {category.postCount.toLocaleString()} stories
          </span>
        </div>
        {category.description ? <p className="body-lg text-muted-foreground max-md:body-md">{category.description}</p> : null}
      </header>

      <section className="hidden space-y-5 max-md:block" aria-label={`${category.name} mobile stories`}>
        {featuredPost ? <MobileFeatureStory post={featuredPost} eyebrow="Latest lead" /> : null}
        {remainingPosts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="heading-sm">More latest stories</h2>
              <span className="ui-sm text-muted-foreground">{result.total.toLocaleString()} total</span>
            </div>
            <MobilePostList posts={remainingPosts} />
          </div>
        ) : null}
        {result.items.length > 0 ? (
          <Pagination basePath={`/${countryCode}/category/${slug}`} page={result.page} totalPages={result.totalPages} />
        ) : (
          <p className="body-lg rounded-2xl border border-border bg-card p-5 text-muted-foreground shadow-sm">
            No stories in this category yet.
          </p>
        )}
      </section>

      <div className="max-md:hidden">
        <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
          {result.items.length > 0 ? (
            <div className="space-y-8">
              <NewsGrid posts={result.items} />
              <Pagination basePath={`/${countryCode}/category/${slug}`} page={result.page} totalPages={result.totalPages} />
            </div>
          ) : (
            <p className="body-lg text-muted-foreground">No stories in this category yet.</p>
          )}
        </RailLayout>
      </div>
    </Container>
  );
}
