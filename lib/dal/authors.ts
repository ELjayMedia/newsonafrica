import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL } from "@/lib/wordpress/graphql-client";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Author, PaginatedResult } from "@/lib/dal/types";
import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";

const REVALIDATE_SECONDS = 300;

export interface ListAuthorsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

type GqlAuthor = {
  databaseId?: number | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  avatar?: { url?: string | null } | null;
};

type AuthorsData = { users?: { nodes?: GqlAuthor[] | null; pageInfo?: { hasNextPage?: boolean } | null } | null };
type AuthorData = { user?: GqlAuthor | null };

const AUTHOR_FIELDS = /* GraphQL */ `
  databaseId
  name
  slug
  description
  avatar {
    url
  }
`;

const AUTHORS_QUERY = /* GraphQL */ `
  query Authors($first: Int!) {
    users(first: $first, where: { orderby: NAME, order: ASC }) {
      pageInfo {
        hasNextPage
      }
      nodes {
        ${AUTHOR_FIELDS}
      }
    }
  }
`;

const AUTHOR_BY_SLUG_QUERY = /* GraphQL */ `
  query AuthorBySlug($slug: ID!) {
    user(id: $slug, idType: SLUG) {
      ${AUTHOR_FIELDS}
    }
  }
`;

function mapAuthor(raw: GqlAuthor): Author {
  return {
    id: raw.databaseId ?? 0,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    bio: stripHtml(raw.description ?? ""),
    avatarUrl: raw.avatar?.url ?? undefined,
  };
}

async function graphQL<T>(country: CountryCode | string, query: string, variables: Record<string, unknown>, tags: string[], operationName: string): Promise<T> {
  const result = await fetchWordPressGraphQL<T>(country, query, variables, {
    tags,
    revalidate: REVALIDATE_SECONDS,
    operationName,
  });

  if (!result.ok) throw result.error;
  return result.data;
}

export async function listAuthors(params: ListAuthorsParams): Promise<PaginatedResult<Author>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const first = page * perPage;
  const data = await graphQL<AuthorsData>(
    params.country,
    AUTHORS_QUERY,
    { first },
    [cacheTags.authors(params.country)],
    "Authors",
  );

  const allItems = data.users?.nodes ?? [];
  const items = allItems.slice((page - 1) * perPage, page * perPage).map(mapAuthor);
  const hasNextPage = Boolean(data.users?.pageInfo?.hasNextPage) || allItems.length > page * perPage;
  const total = hasNextPage ? page * perPage + 1 : (page - 1) * perPage + items.length;

  return buildPaginatedResult(items, page, perPage, {
    total,
    totalPages: hasNextPage ? page + 1 : page,
  });
}

export async function getAuthorIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const author = await getAuthorBySlug(country, slug);
  return author?.id ?? null;
}

export async function getAuthorBySlug(country: CountryCode | string, slug: string): Promise<Author | null> {
  const data = await graphQL<AuthorData>(
    country,
    AUTHOR_BY_SLUG_QUERY,
    { slug },
    [cacheTags.author(country, slug)],
    "AuthorBySlug",
  );

  return data.user ? mapAuthor(data.user) : null;
}
