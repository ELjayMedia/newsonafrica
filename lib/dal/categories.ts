/**
 * Category data access (NOA-86). REST is the transport (no plugin
 * dependency); results are tagged for on-demand revalidation (NOA-88).
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressRest, fetchWordPressRestList } from "@/lib/wordpress/rest-client";
import type { WPRestCategory } from "@/lib/wordpress/types";
import { mapCategory } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Category, PaginatedResult } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 300;

export interface ListCategoriesParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

export async function listCategories(params: ListCategoriesParams): Promise<PaginatedResult<Category>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);

  const { items, pageInfo } = await fetchWordPressRestList<WPRestCategory>(params.country, "categories", {
    params: { page, per_page: perPage, orderby: "name", order: "asc" },
    tags: [cacheTags.categories(params.country)],
    revalidate: REVALIDATE_SECONDS,
  });

  return buildPaginatedResult(items.map(mapCategory), page, perPage, pageInfo);
}

/** Resolve a category's WordPress term ID from its slug (used to filter posts). */
export async function getCategoryIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const { items } = await fetchWordPressRestList<WPRestCategory>(country, "categories", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.category(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  return items[0]?.id ?? null;
}

export async function getCategoryBySlug(country: CountryCode | string, slug: string): Promise<Category | null> {
  const { items } = await fetchWordPressRestList<WPRestCategory>(country, "categories", {
    params: { slug, per_page: 1 },
    tags: [cacheTags.category(country, slug)],
    revalidate: REVALIDATE_SECONDS,
  });
  const raw = items[0];
  return raw ? mapCategory(raw) : null;
}

export async function getCategoryById(country: CountryCode | string, id: number): Promise<Category | null> {
  try {
    const raw = await fetchWordPressRest<WPRestCategory>(country, `categories/${id}`, {
      tags: [cacheTags.categories(country)],
      revalidate: REVALIDATE_SECONDS,
    });
    return mapCategory(raw);
  } catch {
    return null;
  }
}
