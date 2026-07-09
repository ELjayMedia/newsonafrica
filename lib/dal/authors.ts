/**
 * Author (WordPress user) data access (NOA-86). WPGraphQL transport; only users
 * with published posts are listed, matching the public author surface.
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL, unwrapGraphQL } from "@/lib/wordpress/graphql-client";
import { AUTHORS_QUERY, AUTHOR_BY_SLUG_QUERY } from "@/lib/wordpress/queries";
import type { WPGraphQLAuthorNode, WPGraphQLConnection } from "@/lib/wordpress/types";
import { mapAuthor } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Author, PaginatedResult } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

type AuthorsResult = { users: WPGraphQLConnection<WPGraphQLAuthorNode> | null };
type AuthorResult = { user: WPGraphQLAuthorNode | null };

export interface ListAuthorsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listAuthors(params: ListAuthorsParams): Promise<PaginatedResult<Author>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const result = await fetchWordPressGraphQL<AuthorsResult>(
    params.country,
    AUTHORS_QUERY,
    { size: perPage, offset: (page - 1) * perPage },
    { tags: [cacheTags.authors(params.country)], revalidate: REVALIDATE_SECONDS, operationName: "Authors" },
  );

  const data = unwrapGraphQL(result);
  const nodes = (data.users?.nodes ?? []).filter((node): node is WPGraphQLAuthorNode => Boolean(node));
  const total = data.users?.pageInfo?.offsetPagination?.total ?? nodes.length;

  return buildPaginatedResult(nodes.map(mapAuthor), page, perPage, { total, totalPages: 0 });
}

/** Resolve an author's WordPress user ID from their slug. */
export async function getAuthorIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const author = await getAuthorBySlug(country, slug);
  return author?.id ?? null;
}

export async function getAuthorBySlug(country: CountryCode | string, slug: string): Promise<Author | null> {
  const result = await fetchWordPressGraphQL<AuthorResult>(
    country,
    AUTHOR_BY_SLUG_QUERY,
    { slug },
    { tags: [cacheTags.author(country, slug)], revalidate: REVALIDATE_SECONDS, operationName: "AuthorBySlug" },
  );
  const node = unwrapGraphQL(result).user;
  return node ? mapAuthor(node) : null;
}
