import Link from "next/link";
import { StoryImage } from "@/components/story-image";

import { Badge } from "@/components/ui/badge";
import { COUNTRIES } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import type { SearchResult } from "@/lib/search/types";

/**
 * One ranked hit on the search results page (NOA-94). Adapted from
 * `components/article/article-card.tsx`'s list variant, but rendering the
 * NOA-93 `SearchResult` shape (flat category/tag names, pre-built URL) and
 * showing which country edition the story belongs to — search spans all
 * editions unless filtered.
 */
export function SearchResultCard({ result }: { result: SearchResult }) {
  const category = result.categories[0];
  const countryName = COUNTRIES[result.country]?.name ?? result.country;

  return (
    <article className="group flex gap-3 border-b border-border pb-5 sm:gap-6 sm:pb-6">
      <Link
        href={result.url}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[4/3] w-24 flex-shrink-0 overflow-hidden rounded-media bg-muted sm:w-40 md:w-48"
      >
        <StoryImage src={result.featuredImageUrl} label={category} size="sm" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{countryName}</Badge>
          {category ? <Badge variant="secondary">{category}</Badge> : null}
        </div>

        <h3 className="heading-sm">
          <Link href={result.url} className="transition-colors hover:text-primary">
            {result.title}
          </Link>
        </h3>

        {result.excerpt ? (
          <p className="body-sm hidden text-muted-foreground sm:line-clamp-2 sm:block">
            {result.excerpt}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 ui-sm text-muted-foreground">
          {result.author ? <span className="hidden sm:inline">{result.author}</span> : null}
          {result.author ? (
            <span className="hidden sm:inline" aria-hidden>
              &middot;
            </span>
          ) : null}
          <time dateTime={result.publishedAt}>{formatDate(result.publishedAt)}</time>
        </div>
      </div>
    </article>
  );
}
