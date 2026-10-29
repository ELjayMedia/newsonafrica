import type { Metadata } from "next";
import Link from "next/link";

import { HomeRail } from "@/components/home/home-rail";
import { ThumbRow } from "@/components/home/story-card";
import { Pagination } from "@/components/pagination";
import { SearchResultCard } from "@/components/search/search-result-card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { RailLayout } from "@/components/ui/rail-layout";
import { COUNTRY_LIST, PUBLIC_COUNTRY_LIST, type CountryCode } from "@/lib/countries";
import { getHomeRailData } from "@/lib/dal/home-rail";
import { searchContent } from "@/lib/search";
import {
  buildSearchUrl,
  normalizeCountryFilter,
  normalizeSearchPage,
  normalizeSearchQuery,
} from "@/lib/search/params";
import { cn } from "@/lib/utils";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; country?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = normalizeSearchQuery(q);

  return {
    title: query ? `Search: ${query}` : "Search",
    description: "Search news, articles and stories from across Africa.",
    // Query/page/country variants all canonicalize to the bare search page.
    alternates: { canonical: "/search" },
    robots: { index: false },
  };
}

/** Country filter pills: "All countries" plus one per supported edition. */
function CountryFilter({ query, active }: { query: string; active: CountryCode | null }) {
  const pillClass = (isActive: boolean) =>
    cn(
      "inline-flex h-10 items-center rounded-full border px-4 ui-sm transition-colors md:h-8 md:px-3",
      isActive
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <nav aria-label="Filter results by country" className="flex flex-wrap items-center gap-2">
      <Link
        href={buildSearchUrl({ query })}
        className={pillClass(active === null)}
        aria-current={active === null ? "true" : undefined}
      >
        All countries
      </Link>
      {PUBLIC_COUNTRY_LIST.map((country) => (
        <Link
          key={country.code}
          href={buildSearchUrl({ query, country: country.code })}
          className={pillClass(active === country.code)}
          aria-current={active === country.code ? "true" : undefined}
        >
          {country.name}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Search results page (NOA-94): `?q=` full-text query, `?country=` edition
 * filter, `?page=` pagination — all normalized by the NOA-93 param helpers
 * and served by the `search_content` RPC (ranked, with total counts).
 * The query form is a plain GET form so it works without client JS; the
 * header search box (NOA-95) navigates here too.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const country = normalizeCountryFilter(params.country);
  const page = normalizeSearchPage(params.page);

  const [result, rail] = await Promise.all([
    query ? searchContent({ query, country, page }) : Promise.resolve(null),
    getHomeRailData(country ?? undefined),
  ]);

  return (
    <Container className="space-y-8 py-8">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="display-lg">Search</h1>

        <form action="/search" method="get" role="search" className="flex max-w-2xl gap-2">
          <label htmlFor="search-query" className="sr-only">
            Search query
          </label>
          <Input
            id="search-query"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search news, articles and stories…"
            autoComplete="off"
          />
          {country ? <input type="hidden" name="country" value={country} /> : null}
          <button
            type="submit"
            className="ui-md inline-flex h-10 flex-shrink-0 items-center rounded-md bg-primary px-4 text-primary-foreground transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </form>

        {query ? <CountryFilter query={query} active={country} /> : null}
      </header>

      <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
        {!query ? (
          <>
            <section className="space-y-4 lg:hidden" aria-labelledby="mobile-search-latest">
              <div className="space-y-1">
                <p className="ui-sm font-semibold uppercase tracking-wide text-primary">Latest</p>
                <h2 id="mobile-search-latest" className="heading-md">
                  Latest stories
                </h2>
              </div>

              {rail.latest.length > 0 ? (
                <div className="divide-y divide-border border-y border-border">
                  {rail.latest.map((post) => (
                    <div key={`${post.country}-${post.id}`} className="py-4">
                      <ThumbRow post={post} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="body-sm text-muted-foreground">
                  Latest stories are temporarily unavailable. You can still search across our
                  editions above.
                </p>
              )}
            </section>

            <p className="body-lg hidden text-muted-foreground lg:block">
              Enter a search term to find stories from across our editions.
            </p>
          </>
        ) : result && result.items.length > 0 ? (
          <div className="space-y-8">
            <p className="ui-sm text-muted-foreground" role="status">
              {result.total.toLocaleString("en")} {result.total === 1 ? "result" : "results"} for
              &ldquo;{query}&rdquo;
              {country
                ? ` in ${COUNTRY_LIST.find((c) => c.code === country)?.name ?? country}`
                : ""}
            </p>

            <div className="flex flex-col gap-6">
              {result.items.map((item) => (
                <SearchResultCard key={item.id} result={item} />
              ))}
            </div>

            <Pagination
              basePath="/search"
              page={result.page}
              totalPages={result.totalPages}
              extraParams={{ q: query, ...(country ? { country } : {}) }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="body-lg text-muted-foreground" role="status">
              No results for &ldquo;{query}&rdquo;
              {country
                ? ` in ${COUNTRY_LIST.find((c) => c.code === country)?.name ?? country}`
                : ""}
              .
            </p>
            <p className="body-sm text-muted-foreground">
              Try a different search term{country ? ", or search all countries" : ""}.
            </p>
          </div>
        )}
      </RailLayout>
    </Container>
  );
}
