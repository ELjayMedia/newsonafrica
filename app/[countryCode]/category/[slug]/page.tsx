import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { NewsGrid } from "@/components/home/news-grid";
import { Pagination } from "@/components/pagination";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { COUNTRIES } from "@/lib/countries";
import { getCategoryBySlug, isValidCountry, listPosts } from "@/lib/dal";

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
  const result = await listPosts({ country: countryCode, categorySlug: slug, page, perPage: PER_PAGE });

  return (
    <Container className="space-y-8 py-8">
      {/* BreadcrumbList structured data (NOA-114). */}
      <BreadcrumbJsonLd
        items={[{ name: COUNTRIES[countryCode].name, path: `/${countryCode}` }, { name: category.name }]}
      />
      <header className="space-y-2 border-b border-border pb-6">
        <p className="ui-sm uppercase tracking-wide text-primary">Category</p>
        <h1 className="display-lg">{category.name}</h1>
        {category.description ? <p className="body-lg text-muted-foreground">{category.description}</p> : null}
      </header>

      {result.items.length > 0 ? (
        <>
          <NewsGrid posts={result.items} />
          <Pagination basePath={`/${countryCode}/category/${slug}`} page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <p className="body-lg text-muted-foreground">No stories in this category yet.</p>
      )}
    </Container>
  );
}
