/**
 * Category data access (NOA-86). WPGraphQL is the transport; results are tagged
 * for on-demand revalidation (NOA-88).
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL, unwrapGraphQL } from "@/lib/wordpress/graphql-client";
import { CATEGORIES_QUERY, CATEGORY_BY_ID_QUERY, CATEGORY_BY_SLUG_QUERY } from "@/lib/wordpress/queries";
import type { WPGraphQLConnection, WPGraphQLTermNode } from "@/lib/wordpress/types";
import { mapCategory } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Category, PaginatedResult } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

type CategoriesResult = { categories: WPGraphQLConnection<WPGraphQLTermNode> | null };
type CategoryResult = { category: WPGraphQLTermNode | null };

export interface ListCategoriesParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listCategories(params: ListCategoriesParams): Promise<PaginatedResult<Category>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const result = await fetchWordPressGraphQL<CategoriesResult>(
    params.country,
    CATEGORIES_QUERY,
    { size: perPage, offset: (page - 1) * perPage },
    { tags: [cacheTags.categories(params.country)], revalidate: REVALIDATE_SECONDS, operationName: "Categories" },
  );

  const data = unwrapGraphQL(result);
  const nodes = (data.categories?.nodes ?? []).filter((node): node is WPGraphQLTermNode => Boolean(node));
  const total = data.categories?.pageInfo?.offsetPagination?.total ?? nodes.length;

  return buildPaginatedResult(nodes.map(mapCategory), page, perPage, { total, totalPages: 0 });
}

/** Resolve a category's WordPress term ID from its slug. */
export async function getCategoryIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const category = await getCategoryBySlug(country, slug);
  return category?.id ?? null;
}

export async function getCategoryBySlug(country: CountryCode | string, slug: string): Promise<Category | null> {
  const result = await fetchWordPressGraphQL<CategoriesResult>(
    country,
    CATEGORY_BY_SLUG_QUERY,
    { slug: [slug] },
    { tags: [cacheTags.category(country, slug)], revalidate: REVALIDATE_SECONDS, operationName: "CategoryBySlug" },
  );
  const node = (unwrapGraphQL(result).categories?.nodes ?? []).find((n): n is WPGraphQLTermNode => Boolean(n));
  return node ? mapCategory(node) : null;
}

export async function getCategoryById(country: CountryCode | string, id: number): Promise<Category | null> {
  try {
    const result = await fetchWordPressGraphQL<CategoryResult>(
      country,
      CATEGORY_BY_ID_QUERY,
      { id: String(id) },
      { tags: [cacheTags.categories(country)], revalidate: REVALIDATE_SECONDS, operationName: "CategoryById" },
    );
    const node = unwrapGraphQL(result).category;
    return node ? mapCategory(node) : null;
  } catch {
    return null;
  }
}
