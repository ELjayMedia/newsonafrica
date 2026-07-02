/**
 * Author (WordPress user) data access (NOA-86).
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressRestList } from "@/lib/wordpress/rest-client";
import type { WPRestAuthor } from "@/lib/wordpress/types";
import { mapAuthor } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Author, PaginatedResult } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

export interface ListAuthorsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listAuthors(params: ListAuthorsParams): Promise<PaginatedResult<Author>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const { items, pageInfo } = await fetchWordPressRestList<WPRestAuthor>(params.country, "users", {
    params: { page, per_page: perPage, orderby: "name", order: "asc" },
    tags: [cacheTags.authors(params.country)],
    revalidate: REVALIDATE_SECONDS,
  });

  return buildPaginatedResult(items.map(mapAuthor), page, perPage, pageInfo);
}

/** Resolve an author's WordPress user ID from their slug (used to filter posts). */
export async function getAuthorIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const { items } = await fetchWordPressRestList<WPRestAuthor>(country, "users", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.author(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  return items[0]?.id ?? null;
}

export async function getAuthorBySlug(country: CountryCode | string, slug: string): Promise<Author | null> {
  const { items } = await fetchWordPressRestList<WPRestAuthor>(country, "users", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.author(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  const raw = items[0];
  return raw ? mapAuthor(raw) : null;
}
