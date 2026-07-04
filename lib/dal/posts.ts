/**
 * Post data access (NOA-86): pagination + country/category/tag/author
 * filtering on top of the WordPress REST client. All reads use `_embed=1`
 * so `mapPost`/`mapPostSummary` can populate featured image, terms and
 * author without N+1 requests.
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressRest, fetchWordPressRestList } from "@/lib/wordpress/rest-client";
import type { WPRestPost } from "@/lib/wordpress/types";
import { WordPressRestError } from "@/lib/wordpress/rest-client";
import { getAuthorIdBySlug } from "@/lib/dal/authors";
import { getCategoryIdBySlug } from "@/lib/dal/categories";
import { mapPost, mapPostSummary } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import { getTagIdBySlug } from "@/lib/dal/tags";
import type { PaginatedResult, Post, PostListParams, PostSummary } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 60;

/**
 * List posts for a country, optionally filtered by category/tag/author
 * slug and paginated. Category/tag/author slugs are resolved to WordPress
 * term/user IDs first since the REST posts collection only filters by ID.
 */
export async function listPosts(params: PostListParams): Promise<PaginatedResult<PostSummary>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const { country } = params;

  const [categoryId, tagId, authorId] = await Promise.all([
    params.categorySlug ? getCategoryIdBySlug(country, params.categorySlug) : Promise.resolve(undefined),
    params.tagSlug ? getTagIdBySlug(country, params.tagSlug) : Promise.resolve(undefined),
    params.authorSlug ? getAuthorIdBySlug(country, params.authorSlug) : Promise.resolve(undefined),
  ]);

  // A requested filter that doesn't resolve to a term/user means there can be
  // no matching posts — short-circuit instead of issuing an unfiltered request.
  if (
    (params.categorySlug && categoryId == null) ||
    (params.tagSlug && tagId == null) ||
    (params.authorSlug && authorId == null)
  ) {
    return buildPaginatedResult<PostSummary>([], page, perPage, { total: 0, totalPages: 0 });
  }

  const tags = [cacheTags.posts(country)];
  if (params.categorySlug) tags.push(cacheTags.category(country, params.categorySlug));
  if (params.tagSlug) tags.push(cacheTags.tag(country, params.tagSlug));
  if (params.authorSlug) tags.push(cacheTags.author(country, params.authorSlug));

  const { items, pageInfo } = await fetchWordPressRestList<WPRestPost>(country, "posts", {
    params: {
      page,
      per_page: perPage,
      _embed: true,
      categories: categoryId ?? undefined,
      tags: tagId ?? undefined,
      author: authorId ?? undefined,
      search: params.search,
      orderby: "date",
      order: "desc",
    },
    tags,
    revalidate: REVALIDATE_SECONDS,
  });

  return buildPaginatedResult(
    items.map((raw) => mapPostSummary(raw, country)),
    page,
    perPage,
    pageInfo,
  );
}

export async function getPostBySlug(country: CountryCode | string, slug: string): Promise<Post | null> {
  const { items } = await fetchWordPressRestList<WPRestPost>(country, "posts", {
    params: { slug, _embed: true, status: "publish" },
    tags: [cacheTags.postSlug(country, slug), cacheTags.posts(country)],
    revalidate: REVALIDATE_SECONDS,
  });

  const raw = items[0];
  return raw ? mapPost(raw, country) : null;
}

export async function getPostById(country: CountryCode | string, id: number): Promise<Post | null> {
  try {
    const raw = await fetchWordPressRest<WPRestPost>(country, `posts/${id}`, {
      params: { _embed: true },
      tags: [cacheTags.post(country, id), cacheTags.posts(country)],
      revalidate: REVALIDATE_SECONDS,
    });
    return mapPost(raw, country);
  } catch (error) {
    if (error instanceof WordPressRestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
