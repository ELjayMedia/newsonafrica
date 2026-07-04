/**
 * Tag data access (NOA-86).
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressRestList } from "@/lib/wordpress/rest-client";
import type { WPRestTag } from "@/lib/wordpress/types";
import { mapTag } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { PaginatedResult, Tag } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

export interface ListTagsParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listTags(params: ListTagsParams): Promise<PaginatedResult<Tag>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const { items, pageInfo } = await fetchWordPressRestList<WPRestTag>(params.country, "tags", {
    params: { page, per_page: perPage, orderby: "name", order: "asc" },
    tags: [cacheTags.tags(params.country)],
    revalidate: REVALIDATE_SECONDS,
  });

  return buildPaginatedResult(items.map(mapTag), page, perPage, pageInfo);
}

/** Resolve a tag's WordPress term ID from its slug (used to filter posts). */
export async function getTagIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const { items } = await fetchWordPressRestList<WPRestTag>(country, "tags", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.tag(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  return items[0]?.id ?? null;
}

export async function getTagBySlug(country: CountryCode | string, slug: string): Promise<Tag | null> {
  const { items } = await fetchWordPressRestList<WPRestTag>(country, "tags", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.tag(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  const raw = items[0];
  return raw ? mapTag(raw) : null;
}
