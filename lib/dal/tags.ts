import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL } from "@/lib/wordpress/graphql-client";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { PaginatedResult, Tag } from "@/lib/dal/types";
import { decodeHtmlEntities } from "@/lib/wordpress/html";

const REVALIDATE_SECONDS = 300;

export interface ListTagsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

type GqlTag = { databaseId?: number | null; name?: string | null; slug?: string | null; count?: number | null };
type TagsData = { tags?: { nodes?: GqlTag[] | null; pageInfo?: { hasNextPage?: boolean } | null } | null };
type TagData = { tag?: GqlTag | null };

const TAG_FIELDS = /* GraphQL */ `
  databaseId
  name
  slug
  count
`;

const TAGS_QUERY = /* GraphQL */ `
  query Tags($first: Int!) {
    tags(first: $first, where: { orderby: NAME, order: ASC }) {
      pageInfo {
        hasNextPage
      }
      nodes {
        ${TAG_FIELDS}
      }
    }
  }
`;

const TAG_BY_SLUG_QUERY = /* GraphQL */ `
  query TagBySlug($slug: ID!) {
    tag(id: $slug, idType: SLUG) {
      ${TAG_FIELDS}
    }
  }
`;

function mapTag(raw: GqlTag): Tag {
  return {
    id: raw.databaseId ?? 0,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    postCount: raw.count ?? 0,
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

export async function listTags(params: ListTagsParams): Promise<PaginatedResult<Tag>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const first = page * perPage;
  const data = await graphQL<TagsData>(params.country, TAGS_QUERY, { first }, [cacheTags.tags(params.country)], "Tags");

  const allItems = data.tags?.nodes ?? [];
  const items = allItems.slice((page - 1) * perPage, page * perPage).map(mapTag);
  const hasNextPage = Boolean(data.tags?.pageInfo?.hasNextPage) || allItems.length > page * perPage;
  const total = hasNextPage ? page * perPage + 1 : (page - 1) * perPage + items.length;

  return buildPaginatedResult(items, page, perPage, {
    total,
    totalPages: hasNextPage ? page + 1 : page,
  });
}

export async function getTagIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const tag = await getTagBySlug(country, slug);
  return tag?.id ?? null;
}

export async function getTagBySlug(country: CountryCode | string, slug: string): Promise<Tag | null> {
  const data = await graphQL<TagData>(country, TAG_BY_SLUG_QUERY, { slug }, [cacheTags.tag(country, slug)], "TagBySlug");
  return data.tag ? mapTag(data.tag) : null;
}
