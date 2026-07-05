import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { NewsGrid } from "@/components/home/news-grid";
import { MostReadRail } from "@/components/home/most-read-rail";
import { MobileFeatureStory, MobilePostList } from "@/components/article/mobile-post-list";
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
  const [featuredPost, ...remainingPosts] = result.items;
  const focusAreas = Array.from(
    new Set(result.items.flatMap((post) => post.categories.map((category) => category.name))),
  ).slice(0, 6);

  return (
    <Container className="space-y-8 py-8 max-md:space-y-5 max-md:px-4 max-md:py-4">
      <header className="flex items-center gap-4 border-b border-border pb-6 max-md:block max-md:rounded-2xl max-md:border max-md:bg-card max-md:p-5 max-md:shadow-sm">
        <div className="flex items-center gap-4">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
            <img src={author.avatarUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover max-md:h-20 max-md:w-20" />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary max-md:h-20 max-md:w-20">
              {author.name.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <p className="ui-sm uppercase tracking-wide text-primary">Author</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display-lg max-md:text-3xl">{author.name}</h1>
              <span className="hidden ui-sm rounded-full bg-primary/10 px-2.5 py-1 text-primary max-md:inline-flex">
                Verified
              </span>
            </div>
            <p className="hidden ui-sm text-muted-foreground max-md:block">News On Africa contributor</p>
          </div>
        </div>
        {author.bio ? <p className="body-md text-muted-foreground max-md:mt-4">{author.bio}</p> : null}
        <div className="hidden grid-cols-3 gap-2 pt-4 max-md:grid" aria-label="Author profile highlights">
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="heading-sm">{result.total.toLocaleString()}</p>
            <p className="ui-sm text-muted-foreground">Stories</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="heading-sm">{focusAreas.length || 1}</p>
            <p className="ui-sm text-muted-foreground">Focus</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="heading-sm">NOA</p>
            <p className="ui-sm text-muted-foreground">Trusted</p>
          </div>
        </div>
      </header>

      <section className="hidden space-y-5 max-md:block" aria-label={`Stories by ${author.name}`}>
        {focusAreas.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="heading-sm">Focus areas</h2>
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((focusArea) => (
                <span key={focusArea} className="ui-sm rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                  {focusArea}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {featuredPost ? <MobileFeatureStory post={featuredPost} eyebrow="Latest by author" /> : null}
        {remainingPosts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="heading-sm">Recent stories</h2>
              <span className="ui-sm text-muted-foreground">{result.total.toLocaleString()} total</span>
            </div>
            <MobilePostList posts={remainingPosts} />
          </div>
        ) : null}
        {result.items.length > 0 ? (
          <Pagination basePath={`/${countryCode}/author/${slug}`} page={result.page} totalPages={result.totalPages} />
        ) : (
          <p className="body-lg rounded-2xl border border-border bg-card p-5 text-muted-foreground shadow-sm">
            No stories from this author yet.
          </p>
        )}
      </section>

      <div className="max-md:hidden">
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
      </div>
    </Container>
  );
}
