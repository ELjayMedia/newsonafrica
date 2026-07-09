/**
 * Tag data access (NOA-86). WPGraphQL transport.
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL, unwrapGraphQL } from "@/lib/wordpress/graphql-client";
import { TAGS_QUERY, TAG_BY_SLUG_QUERY } from "@/lib/wordpress/queries";
import type { WPGraphQLConnection, WPGraphQLTermNode } from "@/lib/wordpress/types";
import { mapTag } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { PaginatedResult, Tag } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

type TagsResult = { tags: WPGraphQLConnection<WPGraphQLTermNode> | null };

export interface ListTagsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listTags(params: ListTagsParams): Promise<PaginatedResult<Tag>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const result = await fetchWordPressGraphQL<TagsResult>(
    params.country,
    TAGS_QUERY,
    { size: perPage, offset: (page - 1) * perPage },
    { tags: [cacheTags.tags(params.country)], revalidate: REVALIDATE_SECONDS, operationName: "Tags" },
  );

  const data = unwrapGraphQL(result);
  const nodes = (data.tags?.nodes ?? []).filter((node): node is WPGraphQLTermNode => Boolean(node));
  const total = data.tags?.pageInfo?.offsetPagination?.total ?? nodes.length;

  return buildPaginatedResult(nodes.map(mapTag), page, perPage, { total, totalPages: 0 });
}

/** Resolve a tag's WordPress term ID from its slug. */
export async function getTagIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const tag = await getTagBySlug(country, slug);
  return tag?.id ?? null;
}

export async function getTagBySlug(country: CountryCode | string, slug: string): Promise<Tag | null> {
  const result = await fetchWordPressGraphQL<TagsResult>(
    country,
    TAG_BY_SLUG_QUERY,
    { slug: [slug] },
    { tags: [cacheTags.tag(country, slug)], revalidate: REVALIDATE_SECONDS, operationName: "TagBySlug" },
  );
  const node = (unwrapGraphQL(result).tags?.nodes ?? []).find((n): n is WPGraphQLTermNode => Boolean(n));
  return node ? mapTag(node) : null;
}
