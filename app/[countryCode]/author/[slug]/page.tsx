import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { NewsGrid } from "@/components/home/news-grid";
import { MostReadRail } from "@/components/home/most-read-rail";
import { Pagination } from "@/components/pagination";
import { getAuthorBySlug, getMostReadPosts, isValidCountry, listPosts } from "@/lib/dal";

interface AuthorPageProps {
  params: Promise<{ countryCode: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 12;

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { countryCode, slug } = await params;
  if (!isValidCountry(countryCode)) return {};

  const author = await getAuthorBySlug(countryCode, slug);
  if (!author) return {};

  return {
    title: author.name,
    description: author.bio || `Articles by ${author.name}.`,
    alternates: { canonical: `/${countryCode}/author/${slug}` },
  };
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const { countryCode, slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const author = await getAuthorBySlug(countryCode, slug);
  if (!author) {
    notFound();
  }

  const page = Number(pageParam) || 1;
  const [result, mostRead] = await Promise.all([
    listPosts({ country: countryCode, authorSlug: slug, page, perPage: PER_PAGE }),
    getMostReadPosts(countryCode, 6),
  ]);

  return (
    <Container className="space-y-8 py-8">
      <header className="flex items-center gap-4 border-b border-border pb-6">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
          <img src={author.avatarUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
        ) : null}
        <div className="space-y-1">
          <p className="ui-sm uppercase tracking-wide text-primary">Author</p>
          <h1 className="display-lg">{author.name}</h1>
          {author.bio ? <p className="body-md text-muted-foreground">{author.bio}</p> : null}
        </div>
      </header>

      <RailLayout rail={mostRead.length > 0 ? <MostReadRail posts={mostRead} /> : undefined}>
        {result.items.length > 0 ? (
          <div className="space-y-8">
            <NewsGrid posts={result.items} />
            <Pagination basePath={`/${countryCode}/author/${slug}`} page={result.page} totalPages={result.totalPages} />
          </div>
        ) : (
          <p className="body-lg text-muted-foreground">No stories from this author yet.</p>
        )}
      </RailLayout>
    </Container>
  );
}
