import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL } from "@/lib/wordpress/graphql-client";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { Category, PaginatedResult } from "@/lib/dal/types";
import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";

const REVALIDATE_SECONDS = 300;

export interface ListCategoriesParams {
  country: CountryCode | string;
  page?: number;
  perPage?: number;
}

type GqlCategory = {
  databaseId?: number | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  count?: number | null;
};

type CategoriesData = { categories?: { nodes?: GqlCategory[] | null; pageInfo?: { hasNextPage?: boolean } | null } | null };
type CategoryData = { category?: GqlCategory | null };

const CATEGORY_FIELDS = /* GraphQL */ `
  databaseId
  name
  slug
  description
  count
`;

const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories($first: Int!) {
    categories(first: $first, where: { orderby: NAME, order: ASC }) {
      pageInfo {
        hasNextPage
      }
      nodes {
        ${CATEGORY_FIELDS}
      }
    }
  }
`;

const CATEGORY_BY_SLUG_QUERY = /* GraphQL */ `
  query CategoryBySlug($slug: ID!) {
    category(id: $slug, idType: SLUG) {
      ${CATEGORY_FIELDS}
    }
  }
`;

const CATEGORY_BY_ID_QUERY = /* GraphQL */ `
  query CategoryById($id: ID!) {
    category(id: $id, idType: DATABASE_ID) {
      ${CATEGORY_FIELDS}
    }
  }
`;

function mapCategory(raw: GqlCategory): Category {
  return {
    id: raw.databaseId ?? 0,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    description: stripHtml(raw.description ?? ""),
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

export async function listCategories(params: ListCategoriesParams): Promise<PaginatedResult<Category>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const first = page * perPage;
  const data = await graphQL<CategoriesData>(
    params.country,
    CATEGORIES_QUERY,
    { first },
    [cacheTags.categories(params.country)],
    "Categories",
  );

  const allItems = data.categories?.nodes ?? [];
  const items = allItems.slice((page - 1) * perPage, page * perPage).map(mapCategory);
  const hasNextPage = Boolean(data.categories?.pageInfo?.hasNextPage) || allItems.length > page * perPage;
  const total = hasNextPage ? page * perPage + 1 : (page - 1) * perPage + items.length;

  return buildPaginatedResult(items, page, perPage, {
    total,
    totalPages: hasNextPage ? page + 1 : page,
  });
}

export async function getCategoryIdBySlug(country: CountryCode | string, slug: string): Promise<number | null> {
  const category = await getCategoryBySlug(country, slug);
  return category?.id ?? null;
}

export async function getCategoryBySlug(country: CountryCode | string, slug: string): Promise<Category | null> {
  const data = await graphQL<CategoryData>(
    country,
    CATEGORY_BY_SLUG_QUERY,
    { slug },
    [cacheTags.category(country, slug)],
    "CategoryBySlug",
  );
  return data.category ? mapCategory(data.category) : null;
}

export async function getCategoryById(country: CountryCode | string, id: number): Promise<Category | null> {
  const data = await graphQL<CategoryData>(
    country,
    CATEGORY_BY_ID_QUERY,
    { id: String(id) },
    [cacheTags.categories(country)],
    "CategoryById",
  );
  return data.category ? mapCategory(data.category) : null;
}
