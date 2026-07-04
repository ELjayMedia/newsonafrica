import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { NewsGrid } from "@/components/home/news-grid";
import { MostReadRail } from "@/components/home/most-read-rail";
import { Pagination } from "@/components/pagination";
import { getMostReadPosts, getTagBySlug, isValidCountry, listPosts } from "@/lib/dal";

interface TagPageProps {
  params: Promise<{ countryCode: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 12;

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { countryCode, slug } = await params;
  if (!isValidCountry(countryCode)) return {};

  const tag = await getTagBySlug(countryCode, slug);
  if (!tag) return {};

  return {
    title: `#${tag.name}`,
    description: `Latest stories tagged "${tag.name}".`,
    alternates: { canonical: `/${countryCode}/tag/${slug}` },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { countryCode, slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const tag = await getTagBySlug(countryCode, slug);
  if (!tag) {
    notFound();
  }

  const page = Number(pageParam) || 1;
  const [result, mostRead] = await Promise.all([
    listPosts({ country: countryCode, tagSlug: slug, page, perPage: PER_PAGE }),
    getMostReadPosts(countryCode, 6),
  ]);

  return (
    <Container className="space-y-8 py-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="ui-sm uppercase tracking-wide text-primary">Tag</p>
        <h1 className="display-lg">#{tag.name}</h1>
      </header>

      <RailLayout rail={mostRead.length > 0 ? <MostReadRail posts={mostRead} /> : undefined}>
        {result.items.length > 0 ? (
          <div className="space-y-8">
            <NewsGrid posts={result.items} />
            <Pagination basePath={`/${countryCode}/tag/${slug}`} page={result.page} totalPages={result.totalPages} />
          </div>
        ) : (
          <p className="body-lg text-muted-foreground">No stories with this tag yet.</p>
        )}
      </RailLayout>
    </Container>
  );
}
